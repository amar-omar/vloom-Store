import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService } from '../../service/cart-service';

@Component({
  selector: 'app-orders',
  imports: [CommonModule, FormsModule],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class Orders {
  cartService = inject(CartService);
  ordersList = this.cartService.orders;

  // متغيرات الفورم المنبثقة
  isCheckoutOpen = false;
  customerName = '';
  customerPhone = '';
  customerAddress = '';
  isSubmitting = false;

  // متغيرات الـ Toast الاحترافي
  showToast = false;
  toastMessage = '';

  increaseQty(order: any) {
    this.cartService.updateQuantity(order.id, order.quantity, 1, order.price);
  }

  decreaseQty(order: any) {
    this.cartService.updateQuantity(order.id, order.quantity, -1, order.price);
  }

  removeOrder(orderId: string) {
    if (confirm('Are you sure you want to delete this order?')) {
      this.cartService.deleteOrder(orderId);
    }
  }

  changeStatus(orderId: string, status: string) {
    this.cartService.updateOrderStatus(orderId, status);
  }

  // فتح نافذة الفورم عند الضغط على Checkout
  checkoutAllOrders() {
    const currentOrders = this.ordersList();
    if (currentOrders.length === 0) {
      this.triggerToast('Your orders list is empty!');
      return;
    }
    this.isCheckoutOpen = true;
  }

  // إرسال بيانات العميل والطلبات لتليجرام
async submitCheckout(event: Event) {
    event.preventDefault();
    const currentOrders = this.ordersList();
    if (currentOrders.length === 0) {
      this.triggerToast('Your orders list is empty.');
      return;
    }
    this.isSubmitting = true;
    try {
      const order = await this.cartService.placeOrder(
        this.customerName.trim(),
        this.customerPhone.trim(),
        this.customerAddress.trim(),
        currentOrders,
      );
      this.isCheckoutOpen = false;
      this.customerName = '';
      this.customerPhone = '';
      this.customerAddress = '';
      this.triggerToast(`Order ${order.order_number} placed successfully.`);
    } catch (error) {
      this.triggerToast(error instanceof Error ? error.message : 'Could not place the order.');
    } finally {
      this.isSubmitting = false;
    }
  }

  // دالة تشغيل الـ Toast وإخفائه تلقائياً بعد 3 ثواني
// دالة تشغيل الـ Toast وإخفائه تلقائياً بعد 3 ثواني
  triggerToast(message: string) {
    this.toastMessage = message;
    this.showToast = true;
    setTimeout(() => {
      this.showToast = false;
    }, 3000);
  }
}