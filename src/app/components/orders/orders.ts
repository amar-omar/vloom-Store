import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CartService } from '../../service/cart-service';

@Component({
  selector: 'app-orders',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class Orders implements OnInit {
  private readonly cartService = inject(CartService);
  readonly ordersList = this.cartService.history;
  loading = signal(false);
  trackingOrder = signal(false);
  orderNumber = '';
  trackingCode = '';
  errorMessage = signal('');

  ngOnInit(): void {
    void this.refreshOrders();
  }

  async refreshOrders(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set('');
    try {
      await this.cartService.refreshOrderHistory();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Could not refresh orders.');
    } finally {
      this.loading.set(false);
    }
  }

  async findOrder(): Promise<void> {
    if (this.trackingOrder()) return;
    this.trackingOrder.set(true);
    this.errorMessage.set('');
    try {
      await this.cartService.trackOrder(this.orderNumber.toUpperCase(), this.trackingCode.toUpperCase());
      this.orderNumber = '';
      this.trackingCode = '';
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Could not find the order.');
    } finally {
      this.trackingOrder.set(false);
    }
  }
}