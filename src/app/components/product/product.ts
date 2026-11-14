import { Component, OnInit, computed, input, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { supabase } from '../../service/supabase'; 
import { CartService } from '../../service/cart-service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-product',
  imports: [CommonModule, RouterLink],
  templateUrl: './product.html',
  styleUrl: './product.css',
})
export class Product implements OnInit {
  private cartService = inject(CartService);
  
  category = input<string>('all');
  showToast = false;
  toastMessage = '';
  
  // قائمة المقاسات المتاحة
  availableSizes = ['M', 'L', 'XL', 'XXL'];

  products = signal<any[]>([]);
  isLoading = true;

  async ngOnInit() {
    await this.fetchProductsFromSupabase();
  }

  async fetchProductsFromSupabase() {
    try {
      const { data, error } = await supabase.from('products').select('*');
      if (error) {
        console.error('Error fetching products:', error.message);
      } else {
        const formattedProducts = (data || []).map(item => {
          let imagesList: string[] = [];
          const rawUrl = item.image_url;

          if (Array.isArray(rawUrl)) {
            imagesList = rawUrl;
          } else if (typeof rawUrl === 'string' && rawUrl.trim() !== '') {
            let cleanStr = rawUrl.trim();
            if (cleanStr.startsWith('[') && cleanStr.endsWith(']')) {
              cleanStr = cleanStr.slice(1, -1);
            }
            imagesList = cleanStr
              .split(',')
              .map(url => url.replace(/["']/g, '').trim())
              .filter(url => url.length > 0);
          }

          if (imagesList.length === 0) {
            imagesList = ['https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=800&auto=format&fit=crop'];
          }

          return {
            id: item.id,
            name: item.name,
            price: item.price,
            images: imagesList,
            activeImageIndex: 0,
            category: item.category || 'General',
            description: item.description,
            selectedSize: 'L' // المقاس الافتراضي
          };
        });
        this.products.set(formattedProducts);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      this.isLoading = false;
    }
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

  addToCart(product: any) {
    this.cartService.addOrder(product);

    this.toastMessage = `Added "${product.name}" (Size: ${product.selectedSize}) to your orders!`;
    this.showToast = true;

    setTimeout(() => {
      this.showToast = false;
    }, 2000);
  }
}