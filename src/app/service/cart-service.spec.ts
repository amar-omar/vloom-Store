import { TestBed } from '@angular/core/testing';

import { CartService } from './cart-service';
import { supabase } from './supabase';

describe('CartService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 405 }));
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('should be created', () => {
    expect(TestBed.inject(CartService)).toBeTruthy();
  });

  it('keeps the cart in browser storage instead of the shared orders table', async () => {
    const from = vi.spyOn(supabase, 'from').mockReturnValue({
      select: () => ({ order: async () => ({ data: [], error: null }) }),
      insert: async () => ({ error: null }),
    } as never);
    const service = TestBed.inject(CartService);

    await service.addOrder({ id: 42, name: 'Test product', price: 100, images: [], selectedSize: 'M' });

    expect(from).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('vloom-cart') ?? '[]')).toEqual([
      expect.objectContaining({ product_id: 42, name: 'Test product', size: 'M', quantity: 1 }),
    ]);
  });

  it('falls back to transactional checkout and stores the server receipt', async () => {
    const receipt = {
      id: 'order-1', order_number: 'VL-123', tracking: 'TRK-123', status: 'PROCESSING',
      total_price: 240, created_at: '2026-11-15T00:00:00Z', items: [],
    };
    vi.spyOn(supabase, 'functions', 'get').mockReturnValue({
      invoke: vi.fn().mockResolvedValue({ data: null, error: { context: { status: 404 } } }),
    } as never);
    const rpc = vi.spyOn(supabase, 'rpc').mockResolvedValue({ data: receipt, error: null } as never);
    const service = TestBed.inject(CartService);
    await service.addOrder({ id: 42, name: 'Test product', price: 100, images: [], selectedSize: 'M' });

    const order = await service.placeOrder('Customer Name', '0123456789', 'Test address', service.orders());

    expect(rpc).toHaveBeenCalledWith('create_store_order', expect.objectContaining({
      p_items: [{ productId: 42, quantity: 1, size: 'M', expectedPrice: 100 }],
    }));
    expect(order.total_price).toBe(240);
    expect(service.orders()).toEqual([]);
    expect(service.history()).toEqual([receipt]);
    expect(JSON.parse(localStorage.getItem('vloom-order-receipts') ?? '[]')).toEqual([receipt]);
  });

  it('uses database checkout when the function is absent before sending any order', async () => {
    vi.mocked(fetch).mockResolvedValue({ status: 404 } as Response);
    const functions = vi.spyOn(supabase, 'functions', 'get');
    const receipt = {
      id: 'order-1', order_number: 'VL-1', tracking: 'TRK-1', status: 'PROCESSING',
      total_price: 100, created_at: '2026-11-15T00:00:00Z', items: [],
    };
    const rpc = vi.spyOn(supabase, 'rpc').mockResolvedValue({ data: receipt, error: null } as never);
    const service = TestBed.inject(CartService);
    await service.addOrder({ id: 42, name: 'Jacket', price: 100, images: [], selectedSize: 'M' });

    await service.placeOrder('Customer Name', '0123456789', 'Test address', service.orders());

    expect(functions).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith('create_store_order', expect.anything());
  });

  it('keeps cart items when checkout fails', async () => {
    vi.spyOn(supabase, 'functions', 'get').mockReturnValue({
      invoke: vi.fn().mockResolvedValue({ data: null, error: { context: { status: 404 } } }),
    } as never);
    vi.spyOn(supabase, 'rpc').mockResolvedValue({ data: null, error: { message: 'Item unavailable' } } as never);
    const service = TestBed.inject(CartService);
    await service.addOrder({ id: 42, name: 'Test product', price: 100, images: [], selectedSize: 'M' });

    await expect(service.placeOrder('Customer Name', '0123456789', 'Test address', service.orders()))
      .rejects.toThrow('Item unavailable');
    expect(service.orders()).toHaveLength(1);
  });

  it('does not retry through the database after an uncertain function failure', async () => {
    vi.spyOn(supabase, 'functions', 'get').mockReturnValue({
      invoke: vi.fn().mockResolvedValue({ data: null, error: { name: 'FunctionsFetchError', message: 'Connection lost' } }),
    } as never);
    const rpc = vi.spyOn(supabase, 'rpc');
    const service = TestBed.inject(CartService);
    await service.addOrder({ id: 42, name: 'Jacket', price: 100, images: [], selectedSize: 'M' });

    await expect(service.placeOrder('Customer Name', '0123456789', 'Test address', service.orders()))
      .rejects.toThrow('Could not confirm your order');
    expect(rpc).not.toHaveBeenCalled();
    expect(service.orders()).toHaveLength(1);
  });

  it('warns when a database checkout loses its response', async () => {
    vi.mocked(fetch).mockResolvedValue({ status: 404 } as Response);
    const rpc = vi.spyOn(supabase, 'rpc').mockResolvedValue({
      data: null, error: { code: '', message: 'Failed to fetch' }, status: 0,
    } as never);
    const service = TestBed.inject(CartService);
    await service.addOrder({ id: 42, name: 'Jacket', price: 100, images: [], selectedSize: 'M' });

    await expect(service.placeOrder('Customer Name', '0123456789', 'Test address', service.orders()))
      .rejects.toThrow('Could not confirm your order');
    expect(rpc).toHaveBeenCalledOnce();
    expect(service.orders()).toHaveLength(1);
  });

  it('updates quantities by product and size and restores them on reload', async () => {
    const service = TestBed.inject(CartService);
    await service.addOrder({ id: 42, name: 'Jacket', price: 100, images: [], selectedSize: 'M' });
    await service.addOrder({ id: 42, name: 'Jacket', price: 120, images: [], selectedSize: 'M' });
    await service.addOrder({ id: 42, name: 'Jacket', price: 120, images: [], selectedSize: 'L' });
    expect(service.orders()).toEqual([
      expect.objectContaining({ size: 'M', quantity: 2, price: 120, total_price: 240 }),
      expect.objectContaining({ size: 'L', quantity: 1, price: 120, total_price: 120 }),
    ]);
    await service.updateQuantity(service.orders()[0].id, -1);
    expect(new CartService().orders()).toEqual(service.orders());
  });

  it('keeps items added while checkout is in flight', async () => {
    let finishCheckout!: (value: unknown) => void;
    const pending = new Promise((resolve) => { finishCheckout = resolve; });
    vi.spyOn(supabase, 'functions', 'get').mockReturnValue({ invoke: vi.fn().mockReturnValue(pending) } as never);
    const service = TestBed.inject(CartService);
    await service.addOrder({ id: 42, name: 'Jacket', price: 100, images: [], selectedSize: 'M' });
    const checkout = service.placeOrder('Customer Name', '0123456789', 'Test address', [...service.orders()]);
    await service.addOrder({ id: 42, name: 'Jacket', price: 100, images: [], selectedSize: 'M' });
    finishCheckout({ data: { order: {
      id: 'order-1', order_number: 'VL-1', tracking: 'TRK-1', status: 'PROCESSING',
      total_price: 100, created_at: '2026-11-15T00:00:00Z', items: [],
    } }, error: null });

    await checkout;
    expect(service.orders()).toEqual([expect.objectContaining({ quantity: 1, total_price: 100 })]);
  });

  it('updates an already saved receipt when tracking it again', async () => {
    const receipt = {
      id: 'order-1', order_number: 'VL-1', tracking: 'TRK-1', status: 'PROCESSING',
      total_price: 100, created_at: '2026-11-15T00:00:00Z', items: [],
    };
    localStorage.setItem('vloom-order-receipts', JSON.stringify([receipt]));
    vi.spyOn(supabase, 'rpc').mockResolvedValue({ data: { ...receipt, status: 'SHIPPED' }, error: null } as never);
    const service = TestBed.inject(CartService);

    await service.trackOrder('VL-1', 'TRK-1');

    expect(service.history()[0].status).toBe('SHIPPED');
    expect(service.history()).toHaveLength(1);
  });
});
