import { Component } from '@angular/core';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from "@angular/forms";
import { supabase } from '../../service/supabase';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  
  // الفورم بتاعتك مع إضافة حقل الـ age
  register = new FormGroup({
    name: new FormControl(null, [Validators.required, Validators.minLength(3), Validators.maxLength(20)]),
    email: new FormControl(null, [Validators.required, Validators.email]),
    age: new FormControl(null, [Validators.required]), 
    password: new FormControl(null, [Validators.required, Validators.pattern("^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$")]),
    rePassword: new FormControl(null, [Validators.required])
  });

  // دالة التنفيذ عند الضغط على زر التسجيل
async onRegister() {
  if (this.register.invalid) {
    this.register.markAllAsTouched();
    return;
  }

  const { email, password } = this.register.value;

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email!,
      password: password!,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert('تم إنشاء الحساب بنجاح!');
    this.register.reset();
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}
}