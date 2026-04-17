import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterOutlet, RouterLink, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { Student } from '../../core/models';

interface NavItem { label: string; route: string; icon: string; soon?: boolean; }

@Component({
  selector: 'app-coach-shell',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterOutlet, RouterLink],
  templateUrl: './coach-shell.component.html',
  styleUrl: './coach-shell.component.scss'
})
export class CoachShellComponent implements OnInit {
  sidebarOpen = signal(false);
  showNewPlanModal = signal(false);
  students = signal<Student[]>([]);
  saving = signal(false);
  toast = signal<string>('');

  currentUrl = signal('');

  navItems: NavItem[] = [
    { label: 'Dashboard',  route: '/coach/dashboard', icon: 'dashboard' },
    { label: 'Alunos',     route: '/coach/students',  icon: 'group' },
    { label: 'Planos',     route: '/coach/plans',     icon: 'fitness_center' },
    { label: 'Biblioteca', route: '/coach/library',   icon: 'menu_book' },
    { label: 'Mensagens',  route: '/coach/messages',  icon: 'chat' },
    { label: 'Financeiro', route: '/coach/financial', icon: 'payments'  },
  ];

  form!: FormGroup;

  constructor(
    public auth: AuthService,
    private api: ApiService,
    private router: Router,
    private fb: FormBuilder,
  ) {
    this.form = this.fb.group({
      studentId: ['', Validators.required],
      title:     ['Mês 1 — Treino', Validators.required],
      month:     [1,  [Validators.required, Validators.min(1), Validators.max(12)]],
    });

    // Atualiza o título automaticamente quando o mês muda (se ainda não foi editado pelo usuário)
    this.form.get('month')!.valueChanges.subscribe((m: number) => {
      const titleCtrl = this.form.get('title')!;
      const current = titleCtrl.value as string;
      if (!current || /^Mês \d+ — Treino$/.test(current)) {
        titleCtrl.setValue(`Mês ${m || 1} — Treino`, { emitEvent: false });
      }
    });
  }

  ngOnInit(): void {
    this.currentUrl.set(this.router.url);
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(e => {
      this.currentUrl.set((e as NavigationEnd).urlAfterRedirects);
    });
    const coach = this.auth.currentUser();
    if (!coach) return;
    this.api.getStudents(coach.id).subscribe(s => this.students.set(s));
  }

  isNavActive(route: string): boolean {
    if (!route) return false;
    const url = this.currentUrl();
    if (route === '/coach/plans') {
      return url.startsWith('/coach/plans') || url.startsWith('/coach/plan-builder');
    }
    return url.startsWith(route);
  }

  openModal(): void {
    this.form.reset({ studentId: '', title: 'Mês 1 — Treino', month: 1 });
    this.showNewPlanModal.set(true);
  }

  closeModal(): void {
    this.showNewPlanModal.set(false);
    this.saving.set(false);
  }

  createPlan(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const { studentId, title, month } = this.form.value as {
      studentId: string; title: string; month: number;
    };

    // Verifica se já existe plano para esse aluno/mês antes de criar duplicata
    this.api.getPlansByStudent(studentId).subscribe({
      next: existing => {
        const duplicate = existing.find(p => p.month === month);
        if (duplicate) {
          this.closeModal();
          this.showToast(`Aluno já tem um plano no Mês ${month}. Abrindo o existente...`);
          this.router.navigate(['/coach/plan-builder', studentId], {
            queryParams: { planId: duplicate.id },
          });
          return;
        }
        this.api.createPlan(studentId, title, month).subscribe({
          next: plan => {
            this.closeModal();
            this.showToast('Plano criado! Abrindo editor...');
            this.router.navigate(['/coach/plan-builder', studentId], {
              queryParams: { planId: plan.id },
            });
          },
          error: () => {
            this.saving.set(false);
            this.showToast('Erro ao criar plano. Tente novamente.');
          },
        });
      },
      error: () => {
        // Se não conseguir verificar, cria mesmo assim
        this.api.createPlan(studentId, title, month).subscribe({
          next: plan => {
            this.closeModal();
            this.showToast('Plano criado! Abrindo editor...');
            this.router.navigate(['/coach/plan-builder', studentId], {
              queryParams: { planId: plan.id },
            });
          },
          error: () => {
            this.saving.set(false);
            this.showToast('Erro ao criar plano. Tente novamente.');
          },
        });
      },
    });
  }

  private showToast(msg: string): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), 3000);
  }

  logout(): void { this.auth.logout(); }
}
