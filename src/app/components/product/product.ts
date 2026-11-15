import { Component, OnInit, computed, input, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { supabase } from '../../service/supabase'; 
import { CartService } from '../../service/cart-service';

@Component({
  selector: 'app-product',
  imports: [CommonModule],
  templateUrl: './product.html',
  styleUrl: './product.css',
})
export class Product implements OnInit {
  private cartService = inject(CartService);
  
  category = input<string>('all');
  showToast = signal(false);
  toastMessage = signal('');
  toastIsError = signal(false);
  
  // قائمة المقاسات المتاحة
  availableSizes = ['M', 'L', 'XL', 'XXL'];

  products = signal<any[]>([]);
  isLoading = signal(true);
  loadError = signal('');

  async ngOnInit() {
    await this.fetchProductsFromSupabase();
  }

  async fetchProductsFromSupabase() {
    this.isLoading.set(true);
    this.loadError.set('');
    try {
      const { data, error } = await supabase.from('products').select('*');
      if (error) throw error;
      const formattedProducts = (data || []).map(item => {
        const price = item.price === null ? NaN : Number(item.price);
        return {
          id: item.id,
          name: item.name,
          price: Number.isFinite(price) && price >= 0 ? price : null,
          images: this.productImages(item.image_url),
          activeImageIndex: 0,
          category: item.category || 'General',
          description: item.description,
          selectedSize: 'L'
        };
      });
      this.products.set(formattedProducts);
    } catch (err) {
      console.error('Error fetching products:', err);
      this.loadError.set('Could not load products. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private productImages(value: unknown): string[] {
    let images: unknown = value;
    if (typeof images === 'string') {
      const text = images.trim();
      if (text.startsWith('[')) {
        try {
          images = JSON.parse(text);
        } catch {
          images = text.replace(/^\[|\]$/g, '').split(/,\s*(?=https?:\/\/|\/|assets\/)/i);
        }
      } else {
        images = text.split(/,\s*(?=https?:\/\/|\/|assets\/)/i);
      }
    }
    const urls = Array.isArray(images)
      ? images.filter((url): url is string => typeof url === 'string').map((url) => url.trim().replace(/^["']|["']$/g, '').trim()).filter(Boolean)
      : [];
    return urls.length ? urls : ['https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=800&auto=format&fit=crop'];
  }

  // اختيار المقاس للمنتج
  selectSize(product: any, size: string) {
    product.selectedSize = size;
  }

  nextImage(product: any, event: Event) {
    event.stopPropagation();
    if (product.images && product.images.length > 1) {
      product.activeImageIndex = (product.activeImageIndex + 1) % product.images.length;
    }
  }

  prevImage(product: any, event: Event) {
    event.stopPropagation();
    if (product.images && product.images.length > 1) {
      product.activeImageIndex = (product.activeImageIndex - 1 + product.images.length) % product.images.length;
    }
  }

  filteredProducts = computed(() =>
    this.products().filter(
      (product) => this.category() === 'all' || product.category === this.category()
    )
  );

  async addToCart(product: any) {
    try {
      await this.cartService.addOrder(product);
      this.toastIsError.set(false);
      this.toastMessage.set(`Added "${product.name}" (Size: ${product.selectedSize}) to your cart.`);
    } catch (error) {
      this.toastIsError.set(true);
      this.toastMessage.set(error instanceof Error ? error.message : 'Could not add this product.');
    }
    this.showToast.set(true);

    setTimeout(() => {
      this.showToast.set(false);
    }, 2000);
  }
}