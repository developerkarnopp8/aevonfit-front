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
    private router: Router,
  ) {
    this.form = this.fb.group({
      email:    ['luan@aevonfit.com',  [Validators.required, Validators.email]],
      password: ['coach123', [Validators.required, Validators.minLength(4)]],
    });
  }

  setRole(role: UserRole): void {
    this.selectedRole.set(role);
    this.error.set('');
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

    const { email, password } = this.form.value as { email: string; password: string };

    this.auth.login(email, password, this.selectedRole()).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate([
          this.selectedRole() === 'coach' ? '/coach/dashboard' : '/athlete/home',
        ]);
      },
      error: (err: Error) => {
        this.loading.set(false);
        this.error.set(err.message ?? 'Erro ao entrar. Verifique suas credenciais.');
      },
    });
  }

  hasError(field: 'email' | 'password'): boolean {
    const ctrl = this.form.get(field);
    return !!(ctrl?.invalid && ctrl.touched);
  }
}
