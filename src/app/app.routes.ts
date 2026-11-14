import { Routes } from '@angular/router';

export const routes: Routes = [
  // 1. إعادة توجيه الصفحة الرئيسية للـ auth
  { path: '', redirectTo: 'auth', pathMatch: 'full' },

  // 2. مسارات المصادقة (تسجيل الدخول وإنشاء حساب)
  {
    path: 'auth',
    loadComponent: () => import('./layout/auth/auth').then((m) => m.Auth),
    children: [
      { path: '', redirectTo: 'login', pathMatch: 'full' },
      {
        path: 'login',
        loadComponent: () => import('./components/login/login').then((m) => m.Login),
      },
      {
        path: 'register',
        loadComponent: () => import('./components/register/register').then((m) => m.Register),
      },
    ],
  },

  // 3. مسارات الموقع الرئيسية (المتجر، الكارت، الهوم، إلخ)
  {
path: 'main',
  loadComponent: () => import('./layout/main/main').then((m) => m.Main),
  children: [
    { path: '', redirectTo: 'home', pathMatch: 'full' },
      {
        path: 'home',
        loadComponent: () => import('./components/home/home').then((m) => m.Home),
      },
      {
        path: 'cart',
        loadComponent: () => import('./components/cart/cart').then((m) => m.Cart),
      },
      {
        path: 'orders',
        loadComponent: () => import('./components/orders/orders').then((m) => m.Orders),
      },
      {
        path: 'product',
        loadComponent: () => import('./components/product/product').then((m) => m.Product),
      },
    ],
  },

  // 4. صفحة الخطأ 404 (تتوضع في النهاية خالص لتلتقط أي مسار غريب في الموقع)
  {
    path: '**',
    loadComponent: () => import('./components/not-found/not-found').then((m) => m.NotFound),
  },
];