import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';

interface Coach {
  id: string;
  name: string;
  email: string;
  aiImportEnabled: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-coaches',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './coaches.component.html',
  styleUrl: './coaches.component.scss',
})
export class CoachesComponent implements OnInit {
  coaches      = signal<Coach[]>([]);
  showModal    = signal(false);
  saving       = signal(false);
  errorMsg     = signal('');
  listErrorMsg = signal('');
  togglingId   = signal<string | null>(null);
  resettingId  = signal<string | null>(null);
  revealedPassword = signal<{ email: string; password: string } | null>(null);

  form!: FormGroup;

  constructor(
    private api: ApiService,
    private fb: FormBuilder,
  ) {
    this.form = this.fb.group({
      name:  ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
    });
  }

  ngOnInit(): void {
    this.load();
  }

  private load(): void {
    this.listErrorMsg.set('');
    this.api.getCoaches().subscribe({
      next: list => this.coaches.set(list),
      error: err => {
        const msg = err?.error?.message;
        this.listErrorMsg.set(Array.isArray(msg) ? msg[0] : (msg ?? 'Erro ao carregar a lista de coaches.'));
      },
    });
  }

  openModal(): void {
    this.form.reset();
    this.errorMsg.set('');
    this.showModal.set(true);
  }

  closeModal(): void {
    this.showModal.set(false);
    this.saving.set(false);
    this.errorMsg.set('');
  }

  createCoach(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.errorMsg.set('');
    const { name, email } = this.form.value as { name: string; email: string };

    this.api.createCoach(name, email).subscribe({
      next: coach => {
        this.closeModal();
        this.revealedPassword.set({ email: coach.email, password: coach.password });
        window.scrollTo({ top: 0, behavior: 'smooth' });
        this.load();
      },
      error: err => {
        const msg = err?.error?.message;
        this.errorMsg.set(Array.isArray(msg) ? msg[0] : (msg ?? 'Erro ao criar coach.'));
        this.saving.set(false);
      },
    });
  }

  resetPassword(coach: Coach): void {
    if (!confirm(`Resetar a senha de ${coach.name}? A senha atual deixa de funcionar imediatamente.`)) return;
    this.resettingId.set(coach.id);
    this.api.resetCoachPassword(coach.id).subscribe({
      next: res => {
        this.resettingId.set(null);
        this.revealedPassword.set({ email: coach.email, password: res.password });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: err => {
        this.resettingId.set(null);
        const msg = err?.error?.message;
        this.listErrorMsg.set(Array.isArray(msg) ? msg[0] : (msg ?? 'Erro ao resetar a senha. Tente novamente.'));
      },
    });
  }

  toggleAi(coach: Coach): void {
    this.togglingId.set(coach.id);
    const next = !coach.aiImportEnabled;
    this.api.toggleCoachAi(coach.id, next).subscribe({
      next: () => {
        this.togglingId.set(null);
        this.coaches.update(list => list.map(c => c.id === coach.id ? { ...c, aiImportEnabled: next } : c));
      },
      error: err => {
        this.togglingId.set(null);
        const msg = err?.error?.message;
        this.listErrorMsg.set(Array.isArray(msg) ? msg[0] : (msg ?? 'Erro ao atualizar a permissão de IA. Tente novamente.'));
      },
    });
  }

  dismissRevealedPassword(): void {
    this.revealedPassword.set(null);
  }

  getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }
}
