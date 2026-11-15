import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Product } from './product';
import { supabase } from '../../service/supabase';

describe('Product', () => {
  let component: Product;
  let fixture: ComponentFixture<Product>;
  const select = vi.fn();

  beforeEach(async () => {
    select.mockResolvedValue({ data: [], error: null });
    vi.spyOn(supabase, 'from').mockReturnValue({ select } as never);
    await TestBed.configureTestingModule({
      imports: [Product]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Product);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('reads JSON image lists and normalizes product prices', async () => {
    select.mockResolvedValue({
      data: [{ id: 1, name: 'Jacket', price: '19.50', image_url: '["https://example.test/a?x=1,2","https://example.test/b"]' }],
      error: null,
    });
    await component.fetchProductsFromSupabase();

    expect(component.products()[0]).toEqual(expect.objectContaining({
      price: 19.5,
      images: ['https://example.test/a?x=1,2', 'https://example.test/b'],
    }));
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Jacket');
  });
});
