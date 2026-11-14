export interface Product {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
  category: string;
  description?: string;
  reviewCount?: number;
  inStock?: boolean;
  rating?: number;
}