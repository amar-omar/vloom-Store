import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Cart } from './cart';
import { CartService } from '../../service/cart-service';

describe('Cart', () => {
  let component: Cart;
  let fixture: ComponentFixture<Cart>;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Cart],
      providers: [provideRouter([])],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Cart);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows checkout errors without losing the cart', async () => {
    const service = TestBed.inject(CartService);
    await service.addOrder({ id: 1, name: 'Jacket', price: 100, images: [], selectedSize: 'M' });
    vi.spyOn(service, 'placeOrder').mockRejectedValue(new Error('Product is unavailable.'));
    component.customerName = 'Customer';
    component.customerPhone = '0123456789';
    component.customerAddress = 'Test address';
    component.openCheckout();

    await component.submitCheckout();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Product is unavailable.');
    expect(component.items()).toHaveLength(1);
  });
});
