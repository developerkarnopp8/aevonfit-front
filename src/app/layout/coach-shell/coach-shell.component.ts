import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterOutlet, RouterLink, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { Student, TrainingPlan } from '../../core/models';
import { NotificationPermissionBannerComponent } from '../../shared/components/notification-permission-banner/notification-permission-banner.component';

interface NavItem { label: string; route: string; icon: string; soon?: boolean; }

@Component({
  selector: 'app-coach-shell',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterOutlet, RouterLink, NotificationPermissionBannerComponent],
  templateUrl: './coach-shell.component.html',
  styleUrl: './coach-shell.component.scss'
})
export class CoachShellComponent implements OnInit {
  sidebarOpen = signal(false);
  showNewPlanModal = signal(false);
  students = signal<Student[]>([]);
  saving = signal(false);
  toast = signal<string>('');

  // Planos já existentes do aluno selecionado no modal — evita duplicata/redirecionamento surpresa
  existingPlansForStudent = signal<TrainingPlan[]>([]);
  loadingExistingPlans = signal(false);
  private monthTouchedByUser = false;

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

    // Atualiza o título automaticamente quando o mês muda (se ainda não foi editado pelo usuário).
    // Só dispara em edição manual do usuário — updates programáticos (auto-sugestão de mês) usam emitEvent: false.
    this.form.get('month')!.valueChanges.subscribe((m: number) => {
      this.monthTouchedByUser = true;
      this.applyDefaultTitle(m);
    });

    // Ao trocar o atleta, busca os planos já existentes dele — evita que o coach
    // tente criar um plano num mês que já tem um (o que hoje só redireciona pro
    // existente sem deixar claro que é um plano diferente do que ele estava vendo).
    this.form.get('studentId')!.valueChanges.subscribe((studentId: string) => {
      this.existingPlansForStudent.set([]);
      if (!studentId) return;
      this.loadingExistingPlans.set(true);
      this.api.getPlansByStudent(studentId).subscribe({
        next: plans => {
          this.existingPlansForStudent.set(plans);
          this.loadingExistingPlans.set(false);
          if (!this.monthTouchedByUser) {
            const nextMonth = plans.length ? Math.max(...plans.map(p => p.month)) + 1 : 1;
            this.form.get('month')!.setValue(nextMonth, { emitEvent: false });
            this.applyDefaultTitle(nextMonth);
          }
        },
        error: () => this.loadingExistingPlans.set(false),
      });
    });
  }

  private applyDefaultTitle(month: number): void {
    const titleCtrl = this.form.get('title')!;
    const current = titleCtrl.value as string;
    if (!current || /^Mês \d+ — Treino$/.test(current)) {
      titleCtrl.setValue(`Mês ${month || 1} — Treino`, { emitEvent: false });
    }
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
    this.existingPlansForStudent.set([]);
    this.form.reset({ studentId: '', title: 'Mês 1 — Treino', month: 1 });
    // reset() acima dispara valueChanges do campo mês, que marcaria monthTouchedByUser
    // como true — por isso essa flag só é zerada DEPOIS do reset, não antes.
    this.monthTouchedByUser = false;
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
          this.showToast(`Já existe "${duplicate.title}" no Mês ${month} — nenhum plano novo foi criado. Abrindo esse plano existente.`, 5000);
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

  private showToast(msg: string, durationMs = 3000): void {
    this.toast.set(msg);
    setTimeout(() => this.toast.set(''), durationMs);
  }

  logout(): void { this.auth.logout(); }
}
