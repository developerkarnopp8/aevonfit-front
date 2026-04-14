import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/models';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  selectedRole = signal<UserRole>('coach');
  showPassword = signal(false);
  error = signal('');
  loading = signal(false);

  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(4)]],
    });
  }

  setRole(role: UserRole): void {
    this.selectedRole.set(role);
    this.error.set('');
    // prefill mock credentials
    if (role === 'coach') {
      this.form.patchValue({ email: 'luan@aevonfit.com', password: 'coach123' });
    } else {
      this.form.patchValue({ email: 'gustavo@aevonfit.com', password: 'athlete123' });
    }
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set('');
    const { email, password } = this.form.value;
    const result = this.auth.login(email, password, this.selectedRole());
    this.loading.set(false);
    if (!result.success) {
      this.error.set(result.error ?? 'Erro ao entrar.');
      return;
    }
    this.router.navigate([this.selectedRole() === 'coach' ? '/coach/dashboard' : '/athlete/home']);
  }

  hasError(field: 'email' | 'password'): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl.touched);
  }
}
