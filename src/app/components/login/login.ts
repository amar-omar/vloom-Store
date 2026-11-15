import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { supabase } from '../../service/supabase';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly router = inject(Router);
  email = '';
  password = '';
  signingIn = signal(false);
  errorMessage = signal('');

  async signIn(): Promise<void> {
    if (this.signingIn()) return;
    this.signingIn.set(true);
    this.errorMessage.set('');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: this.email.trim(),
        password: this.password,
      });
      if (error) throw error;
      if (await this.router.navigateByUrl('/main/home')) this.password = '';
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Could not sign in.');
    } finally {
      this.signingIn.set(false);
    }
  }
}
