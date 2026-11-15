import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';

import { Login } from './login';
import { supabase } from '../../service/supabase';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([])],
    })
    .compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('signs in and opens the store', async () => {
    const signIn = vi.spyOn(supabase.auth, 'signInWithPassword').mockResolvedValue({ error: null } as never);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    component.email = ' customer@example.com ';
    component.password = 'password';

    await component.signIn();

    expect(signIn).toHaveBeenCalledWith({ email: 'customer@example.com', password: 'password' });
    expect(navigate).toHaveBeenCalledWith('/main/home');
    expect(component.password).toBe('');
    vi.restoreAllMocks();
  });
});
