import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CartItem, CartService, StoreOrder } from '../../service/cart-service';

@Component({
  selector: 'app-cart',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class Cart {
  private readonly cartService = inject(CartService);
  readonly items = this.cartService.orders;
  readonly total = computed(() => this.items().reduce((sum, item) => sum + item.total_price, 0));

  isCheckoutOpen = signal(false);
  isSubmitting = signal(false);
  customerName = '';
  customerPhone = '';
  customerAddress = '';
  checkoutError = signal('');
  lastOrder = signal<StoreOrder | null>(null);

  increaseQty(item: CartItem): void {
    void this.cartService.updateQuantity(item.id, 1);
  }

  decreaseQty(item: CartItem): void {
    void this.cartService.updateQuantity(item.id, -1);
  }

  removeItem(item: CartItem): void {
    void this.cartService.deleteOrder(item.id);
  }

  openCheckout(): void {
    if (!this.items().length) return;
    this.checkoutError.set('');
    this.isCheckoutOpen.set(true);
  }

  async submitCheckout(): Promise<void> {
    if (this.isSubmitting() || !this.items().length) return;
    this.isSubmitting.set(true);
    this.checkoutError.set('');
    const items = this.items().map((item) => ({ ...item }));
    try {
      const order = await this.cartService.placeOrder(
        this.customerName.trim(), this.customerPhone.trim(), this.customerAddress.trim(), items,
      );
      this.lastOrder.set(order);
      this.isCheckoutOpen.set(false);
      this.customerName = '';
      this.customerPhone = '';
      this.customerAddress = '';
    } catch (error) {
      this.checkoutError.set(error instanceof Error ? error.message : 'Could not place the order.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
