import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from "@angular/router";
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { type Subscription, type User } from '@supabase/supabase-js';
import { CartService } from '../../service/cart-service';
import { supabase } from '../../service/supabase';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, CommonModule, MatIcon, MatIconButton, MatButton],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar implements OnInit, OnDestroy {
  private readonly cartService = inject(CartService);
  private authSubscription?: Subscription;
  readonly currentUser = signal<User | null>(null);
  readonly authError = signal('');
  isMenuOpen = false;

  ngOnInit(): void {
    this.authSubscription = supabase.auth.onAuthStateChange((event, session) => {
      this.currentUser.set(session?.user ?? null);
      if (event === 'SIGNED_OUT') this.cartService.clearAccountHistory();
    }).data.subscription;
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
  }

  async signOut(): Promise<void> {
    this.authError.set('');
    const { error } = await supabase.auth.signOut();
    if (error) this.authError.set(error.message);
    this.isMenuOpen = false;
  }
}
