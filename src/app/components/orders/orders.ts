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
    const totalAmount = currentOrders.reduce((sum, item) => sum + item.total_price, 0);

    let summaryMessage = `NEW CUSTOMER ORDER!\n\n`;
    summaryMessage += `Customer: ${this.customerName}\n`;
    summaryMessage += `Phone: ${this.customerPhone}\n`;
    summaryMessage += `Address: ${this.customerAddress}\n\n`;
    summaryMessage += `-------------------\n`;
    summaryMessage += `Products:\n`;
    
    currentOrders.forEach((item, index) => {
      summaryMessage += `${index + 1}. ${item.name} (Size: ${item.size || 'L'}, Qty: ${item.quantity}) - ${item.total_price} EGP\n`;
    });
    
    summaryMessage += `-------------------\n`;
    summaryMessage += `TOTAL AMOUNT: ${totalAmount} EGP`;

    const BOT_TOKEN = '8940482021:AAHNinchdue_UiCGfTOFFA7kYLYGjkSE3CE';
    const CHAT_ID = '6409815410';
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    // 1. قفل الفورمة وتفريغ البيانات فوراً لإعطاء استجابة سريعة للـ UX
    this.isCheckoutOpen = false;
    const tempName = this.customerName;
    this.customerName = '';
    this.customerPhone = '';
    this.customerAddress = '';

    // 2. إظهار الـ Toast الاحترافي فوراً
    this.triggerToast('Order placed successfully and sent to Telegram! 🎉');

    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: summaryMessage
        })
      });
    } catch (err) {
      console.error('Telegram API error:', err);
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