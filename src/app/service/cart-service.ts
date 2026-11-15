import { Injectable, signal } from '@angular/core';
import { supabase, supabaseUrl } from '../service/supabase';

const CART_STORAGE_KEY = 'vloom-cart';
const ORDER_STORAGE_KEY = 'vloom-order-receipts';

export interface CartItem {
  id: string;
  product_id: number | string;
  name: string;
  price: number;
  size: string;
  quantity: number;
  total_price: number;
  image: string;
}

export interface StoreOrderItem {
  id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  size: string | null;
  image_url: string | null;
  total_price: number;
}

export interface StoreOrder {
  id: string;
  order_number: string;
  tracking: string;
  status: string;
  total_price: number;
  created_at: string;
  items: StoreOrderItem[];
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private ordersList = signal<CartItem[]>(this.readCart());
  orders = this.ordersList.asReadonly();
  private orderHistory = signal<StoreOrder[]>(this.readReceipts());
  history = this.orderHistory.asReadonly();

  async addOrder(product: any) {
    const currentOrders = this.ordersList();
    const productSize = product.selectedSize || 'L';
    const price = Number(product.price);
    if (product.id === null || product.id === undefined || product.price === null || product.price === undefined || !Number.isFinite(price) || price < 0) {
      throw new Error('This product cannot be added to the cart.');
    }
    const existingOrder = currentOrders.find(
      item => String(item.product_id) === String(product.id) && item.size === productSize
    );

    if (existingOrder) {
      if (existingOrder.quantity >= 100) throw new Error('A cart item cannot exceed 100 units.');
      this.saveCart(currentOrders.map((item) => item.id === existingOrder.id
        ? { ...item, name: product.name, price, quantity: item.quantity + 1, total_price: price * (item.quantity + 1) }
        : item));
    } else {
      if (currentOrders.length >= 50) throw new Error('The cart cannot contain more than 50 items.');
      const newOrder: CartItem = {
        id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        product_id: product.id,
        name: product.name,
        price,
        size: productSize,
        quantity: 1,
        total_price: price,
        image: product.images && product.images.length > 0 ? product.images[0] : 'assets/images/dark.jpg',
      };
      this.saveCart([...currentOrders, newOrder]);
    }
  }

  async placeOrder(
    customerName: string,
    customerPhone: string,
    shippingAddress: string,
    items: CartItem[],
  ) {
    const checkoutItems = items.map((item) => ({
      productId: item.product_id,
      quantity: item.quantity,
      size: item.size,
      expectedPrice: item.price,
    }));
    let order: StoreOrder | undefined;
    let useDatabaseCheckout = !(await this.checkoutFunctionAvailable());
    if (!useDatabaseCheckout) {
      const { data, error } = await supabase.functions.invoke<{ order: StoreOrder }>(
        'store-checkout',
        { body: { customerName, customerPhone, shippingAddress, items: checkoutItems } },
      );
      if (error?.context?.status === 404) {
        useDatabaseCheckout = true;
      } else if (error) {
        let message = error.name === 'FunctionsFetchError'
          ? 'Could not confirm your order. Check your orders or contact the store before trying again.'
          : error.message;
        if (typeof error.context?.json === 'function') {
          const details = await error.context.json().catch(() => null);
          if (typeof details?.error === 'string') message = details.error;
        }
        throw new Error(message);
      } else {
        order = data?.order;
      }
    }
    if (useDatabaseCheckout) {
      const result = await supabase.rpc('create_store_order', {
        p_customer_name: customerName,
        p_customer_phone: customerPhone,
        p_shipping_address: shippingAddress,
        p_items: checkoutItems,
      });
      if (result.error) {
        const message = result.error.code === 'PGRST202'
          ? 'Checkout is not set up. Apply the Supabase migrations and try again.'
          : result.status === 0
            ? 'Could not confirm your order. Check your orders or contact the store before trying again.'
            : result.error.message;
        throw new Error(message);
      }
      order = result.data as StoreOrder | null ?? undefined;
    }
    if (!order?.order_number || !order.tracking) {
      throw new Error('Checkout did not return a receipt. Contact the store before trying again.');
    }
    order = { ...order, items: Array.isArray(order.items) ? order.items : [] };

    const purchasedQuantities = new Map(items.map((item) => [item.id, item.quantity]));
    this.saveCart(this.ordersList().flatMap((item) => {
      const remaining = item.quantity - (purchasedQuantities.get(item.id) ?? 0);
      return remaining > 0 ? [{ ...item, quantity: remaining, total_price: item.price * remaining }] : [];
    }));
    this.rememberOrder(order);
    return order;
  }

  async refreshOrderHistory(): Promise<void> {
    const receipts = this.readReceipts();
    let firstError = '';
    const refreshed = await Promise.all(receipts.map(async (order) => {
      const { data, error } = await supabase.rpc('get_store_order', {
        p_order_number: order.order_number,
        p_tracking: order.tracking,
      });
      if (error) {
        firstError ||= error.message;
        return order;
      }
      return data ? data as StoreOrder : { ...order, status: 'UNAVAILABLE' };
    }));
    this.saveStored(ORDER_STORAGE_KEY, refreshed);

    const session = await supabase.auth.getSession();
    if (session.error) firstError ||= session.error.message;
    let accountOrders: StoreOrder[] = [];
    if (session.data.session) {
      const { data, error } = await supabase
        .from('store_orders')
        .select('id, order_number, tracking, status, total_price, created_at, items:store_order_items(*)')
        .eq('customer_id', session.data.session.user.id)
        .order('created_at', { ascending: false });
      if (error) firstError ||= error.message;
      else accountOrders = (data ?? []) as unknown as StoreOrder[];
    }
    this.setHistory([...refreshed, ...accountOrders]);
    if (firstError) throw new Error(firstError);
  }

  async trackOrder(orderNumber: string, tracking: string): Promise<void> {
    const { data, error } = await supabase.rpc('get_store_order', {
      p_order_number: orderNumber.trim(),
      p_tracking: tracking.trim(),
    });
    if (error) throw new Error(error.message);
    if (!data) throw new Error('No order matched that order number and tracking code.');
    this.rememberOrder(data as StoreOrder);
  }

  clearAccountHistory(): void {
    this.setHistory(this.readReceipts());
  }

  async updateQuantity(orderId: string, delta: number) {
    const item = this.ordersList().find((order) => order.id === orderId);
    if (!item) return;
    const newQty = Math.min(item.quantity + delta, 100);
    if (newQty <= 0) {
      await this.deleteOrder(orderId);
      return;
    }
    this.saveCart(this.ordersList().map((order) => order.id === orderId
      ? { ...order, quantity: newQty, total_price: order.price * newQty }
      : order));
  }

  async deleteOrder(orderId: string) {
    this.saveCart(this.ordersList().filter((order) => order.id !== orderId));
  }

  private readCart(): CartItem[] {
    return this.readStored<CartItem>(CART_STORAGE_KEY).filter((item) =>
      !!item && typeof item.id === 'string' && (typeof item.product_id === 'number' || typeof item.product_id === 'string')
      && typeof item.name === 'string' && typeof item.size === 'string' && typeof item.image === 'string'
      && Number.isFinite(item.price) && item.price >= 0 && Number.isInteger(item.quantity)
      && item.quantity >= 1 && item.quantity <= 100,
    ).map((item) => ({ ...item, total_price: item.price * item.quantity }));
  }

  private readReceipts(): StoreOrder[] {
    return this.readStored<StoreOrder>(ORDER_STORAGE_KEY)
      .filter((order) => !!order?.order_number && !!order.tracking);
  }

  private readStored<T>(key: string): T[] {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') return [];
      const stored = JSON.parse(localStorage.getItem(key) ?? '[]');
      return Array.isArray(stored) ? stored : [];
    } catch {
      return [];
    }
  }

  private saveCart(items: CartItem[]): void {
    this.ordersList.set(items);
    this.saveStored(CART_STORAGE_KEY, items);
  }

  private rememberOrder(order: StoreOrder): void {
    const receipts = [order, ...this.readReceipts().filter((item) => item.id !== order.id)];
    this.saveStored(ORDER_STORAGE_KEY, receipts);
    this.setHistory([...this.orderHistory(), order]);
  }

  private setHistory(orders: StoreOrder[]): void {
    const unique = new Map(orders.map((order) => [order.id, order]));
    this.orderHistory.set([...unique.values()].sort((first, second) =>
      new Date(second.created_at).getTime() - new Date(first.created_at).getTime()));
  }

  private saveStored<T>(key: string, values: T[]): void {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
      localStorage.setItem(key, JSON.stringify(values));
    } catch (error) {
      console.error('Could not save store data:', error);
    }
  }

  private async checkoutFunctionAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/store-checkout`, {
        method: 'GET', signal: AbortSignal.timeout(5000),
      });
      return response.status === 405;
    } catch {
      return false;
    }
  }
}