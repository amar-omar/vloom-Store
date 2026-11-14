import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Product } from '../product/product'; // تأكد من المسار الصحيح للـ Product component

@Component({
  selector: 'app-home',
  imports: [RouterLink, Product],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  // تم نقل منطق المنتجات بالكامل لـ Product Component
}