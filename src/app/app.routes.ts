import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  {
    path: 'home',
    loadComponent:() =>
       import('./components/home/home').then((m) => m.Home)
    },
  {
    path: 'cart',
    loadComponent:() =>
       import('./components/cart/cart').then((m) => m.Cart)
    },
  
  {
    path: 'orders',
    loadComponent:() =>
       import('./components/orders/orders').then((m) => m.Orders)
    
  },
  {
    path: 'product',
    loadComponent:() =>
       import('./components/product/product').then((m) => m.Product)
    },
  
];
