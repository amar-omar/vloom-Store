import { Injectable, signal } from '@angular/core';
import { supabase } from '../service/supabase';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private ordersList = signal<any[]>([]);
  orders = this.ordersList.asReadonly();

  constructor() {
    this.fetchOrders();
  }

  // 1. جلب الطلبات (Read)
  async fetchOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error.message);
    } else {
      this.ordersList.set(data || []);
    }
  }

  // 2. إضافة طلب جديد (Create) مع إرسال إشعار تليجرام
// 2. إضافة طلب جديد (Create) بدون إرسال فوري لتليجرام
 // 2. إضافة طلب جديد أو زيادة كميته لو موجود مسبقاً
async addOrder(product: any) {
    const currentOrders = this.ordersList();
    const productSize = product.selectedSize || 'L';
    
    // البحث إذا كان نفس المنتج ونفس المقاس موجود مسبقاً
    const existingOrder = currentOrders.find(
      item => item.name === product.name && item.size === productSize
    );

    if (existingOrder) {
      await this.updateQuantity(existingOrder.id, existingOrder.quantity, 1, existingOrder.price);
    } else {
      const newOrder = {
        id: 'VL-' + Math.floor(1000 + Math.random() * 9000) + '-X',
        name: product.name,
        price: product.price,
        size: productSize, // إضافة المقاس
        quantity: 1,
        total_price: product.price,
        image: product.images && product.images.length > 0 ? product.images[0] : 'assets/images/dark.jpg',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: 'PROCESSING',
        tracking: 'TRK-' + Math.floor(10000 + Math.random() * 90000)
      };

      const { error } = await supabase.from('orders').insert([newOrder]);
      if (!error) await this.fetchOrders();
    }
  }

  // دالة إرسال التليجرام
  async sendOrderToTelegram(order: any) {
    const BOT_TOKEN = '8940482021:AAHNinchdue_UiCGfTOFFA7kYLYGjkSE3CE';
    const CHAT_ID = '6409815410';

    const message = `🚨 *طلب جديد من متجر Vloom!*\n\n` +
                    `📦 *المنتج:* ${order.name}\n` +
                    `🔢 *الكمية:* ${order.quantity}\n` +
                    `💰 *الإجمالي:* ${order.total_price} EGP\n` +
                    `🔖 *رقم الطلب:* ${order.id}\n` +
                    `🚚 *رقم التتبع:* ${order.tracking}`;

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: message,
          parse_mode: 'Markdown'
        })
      });
      console.log('Telegram notification sent successfully!');
    } catch (err) {
      console.error('Failed to send Telegram message:', err);
    }
  }

  // 3. تحديث الكمية (Update Quantity)
  async updateQuantity(orderId: string, currentQty: number, delta: number, unitPrice: number) {
    const newQty = currentQty + delta;
    if (newQty <= 0) {
      await this.deleteOrder(orderId);
      return;
    }

    const newTotalPrice = unitPrice * newQty;

    const { error } = await supabase
      .from('orders')
      .update({ quantity: newQty, total_price: newTotalPrice })
      .eq('id', orderId);

    if (error) {
      console.error('Error updating quantity:', error.message);
    } else {
      await this.fetchOrders();
    }
  }

  // 4. تحديث الحالة (Update Status)
  async updateOrderStatus(orderId: string, newStatus: string) {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      console.error('Error updating status:', error.message);
    } else {
      await this.fetchOrders();
    }
  }

  // 5. حذف طلب (Delete)
  async deleteOrder(orderId: string) {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) {
      console.error('Error deleting order:', error.message);
    } else {
      await this.fetchOrders();
    }
  }
}