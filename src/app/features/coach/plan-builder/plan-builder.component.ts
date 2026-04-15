import { Component, OnInit, OnChanges, signal, computed, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { TrainingPlan, Exercise, Session, SessionType } from '../../../core/models';

type DrawerMode = 'add' | 'edit';

@Component({
  selector: 'app-plan-builder',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './plan-builder.component.html',
  styleUrl: './plan-builder.component.scss'
})
export class PlanBuilderComponent implements OnInit, OnChanges {
  @Input() studentId!: string;
  @Input() planId?: string;          // opcional: pula direto para um plano específico

  loadError = signal(false);

  plan          = signal<TrainingPlan | null>(null);
  loading       = signal(true);
  selectedWeek  = signal(0);
  expandedSessions = signal<Set<string>>(new Set());

  publishing       = signal(false);
  toastMsg         = signal('');
  initializingPlan = signal(false);

  // Drawer: add / edit exercise
  showExerciseDrawer = signal(false);
  drawerMode         = signal<DrawerMode>('add');
  activeSessionId    = signal<string | null>(null);
  editingExercise    = signal<Exercise | null>(null);
  savingExercise     = signal(false);

  // Add session inline
  showAddSession    = signal<string | null>(null); // dayId being edited
  savingSession     = signal(false);

  sessionTypes: SessionType[] = ['LPO','Strength','Gymnastics','Metcon','Endurance','Mobility','Core'];

  typeColors: Record<SessionType, string> = {
    LPO:        'bg-primary-fixed/20 text-primary-fixed',
    Strength:   'bg-blue-500/20 text-blue-400',
    Gymnastics: 'bg-tertiary/20 text-tertiary',
    Metcon:     'bg-primary/20 text-primary',
    Endurance:  'bg-green-500/20 text-green-400',
    Mobility:   'bg-teal-400/20 text-teal-400',
    Core:       'bg-yellow-500/20 text-yellow-400',
  };

  exerciseForm!: FormGroup;
  sessionForm!:  FormGroup;
  currentWeek = computed(() => this.plan()?.weeks[this.selectedWeek()] ?? null);

  constructor(private api: ApiService, private fb: FormBuilder) {
    this.exerciseForm = this.fb.group({
      name:        ['', Validators.required],
      youtubeUrl:  [''],
      sets:        [null as number | null],
      reps:        [''],
      duration:    [''],
      restSeconds: [90],
      loadPercent: [null as number | null],
      coachNotes:  [''],
    });

    this.sessionForm = this.fb.group({
      name: ['', Validators.required],
      type: ['Strength', Validators.required],
    });
  }

  // ngOnChanges cobre tanto o carregamento inicial quanto a reutilização
  // do componente quando o Angular muda studentId ou planId via router
  ngOnChanges(): void {
    if (!this.studentId) return;
    this.plan.set(null);
    this.loading.set(true);
    this.loadPlan();
  }

  ngOnInit(): void { /* carregamento já feito pelo ngOnChanges */ }

  private loadPlan(): void {
    if (this.planId) {
      this.api.getPlanById(this.planId).subscribe({
        next: plan => { this.plan.set(plan); this.loading.set(false); },
        error: ()  => this.loadByStudent(),
      });
      return;
    }
    this.loadByStudent();
  }

  private loadByStudent(): void {
    this.api.getPlansByStudent(this.studentId).subscribe({
      next: plans => {
        if (!plans.length) { this.loading.set(false); return; }

        // Conta total de sessões por plano e prefere o com mais conteúdo
        const countSessions = (p: TrainingPlan) =>
          p.weeks.reduce((s, w) => s + w.days.reduce((d, day) => d + day.sessions.length, 0), 0);

        const sorted = [...plans].sort((a, b) => {
          const diff = countSessions(b) - countSessions(a);
          if (diff !== 0) return diff;           // mais sessões primeiro
          return b.weeks.length - a.weeks.length; // depois mais semanas
        });

        this.plan.set(sorted[0]);
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); this.loadError.set(true); },
    });
  }

  // ── Sessions ────────────────────────────────────────────────────────────

  toggleSession(sessionId: string): void {
    this.expandedSessions.update(set => {
      const next = new Set(set);
      next.has(sessionId) ? next.delete(sessionId) : next.add(sessionId);
      return next;
    });
  }

  isExpanded(id: string): boolean { return this.expandedSessions().has(id); }

  openAddSession(dayId: string): void {
    this.sessionForm.reset({ type: 'Strength' });
    this.showAddSession.set(dayId);
  }

  saveSession(): void {
    if (this.sessionForm.invalid) { this.sessionForm.markAllAsTouched(); return; }
    const dayId = this.showAddSession();
    if (!dayId) return;
    this.savingSession.set(true);
    const { name, type } = this.sessionForm.value as { name: string; type: string };
    this.api.addSession(dayId, name, type).subscribe({
      next: newSession => {
        this.plan.update(p => {
          if (!p) return p;
          const clone = JSON.parse(JSON.stringify(p)) as TrainingPlan;
          for (const w of clone.weeks) {
            for (const d of w.days) {
              if (d.id === dayId) { d.sessions.push(newSession); break; }
            }
          }
          return clone;
        });
        this.expandedSessions.update(s => new Set([...s, newSession.id]));
        this.showAddSession.set(null);
        this.savingSession.set(false);
      },
      error: () => this.savingSession.set(false),
    });
  }

  deleteSession(sessionId: string): void {
    if (!confirm('Remover esta sessão e todos os exercícios?')) return;
    this.api.deleteSession(sessionId).subscribe({
      next: () => {
        this.plan.update(p => {
          if (!p) return p;
          const clone = JSON.parse(JSON.stringify(p)) as TrainingPlan;
          for (const w of clone.weeks) {
            for (const d of w.days) {
              d.sessions = d.sessions.filter(s => s.id !== sessionId);
            }
          }
          return clone;
        });
      },
    });
  }

  // ── Exercises ────────────────────────────────────────────────────────────

  openAddExercise(sessionId: string): void {
    this.drawerMode.set('add');
    this.activeSessionId.set(sessionId);
    this.editingExercise.set(null);
    this.exerciseForm.reset({ sets: null, restSeconds: 90, loadPercent: null });
    this.showExerciseDrawer.set(true);
  }

  openEditExercise(ex: Exercise, sessionId: string): void {
    this.drawerMode.set('edit');
    this.activeSessionId.set(sessionId);
    this.editingExercise.set(ex);
    this.exerciseForm.patchValue({
      name:        ex.name,
      youtubeUrl:  ex.youtubeUrl ?? '',
      sets:        ex.sets ?? null,
      reps:        ex.reps ?? '',
      duration:    ex.duration ?? '',
      restSeconds: ex.restSeconds ?? 90,
      loadPercent: ex.loadPercent ?? null,
      coachNotes:  ex.coachNotes ?? '',
    });
    this.showExerciseDrawer.set(true);
  }

  saveExercise(): void {
    if (this.exerciseForm.invalid) { this.exerciseForm.markAllAsTouched(); return; }
    this.savingExercise.set(true);

    const v = this.exerciseForm.value as {
      name: string; youtubeUrl: string; sets: number | null; reps: string;
      duration: string; restSeconds: number; loadPercent: number | null; coachNotes: string;
    };

    const dto = {
      name:        v.name,
      youtubeUrl:  v.youtubeUrl || null,
      sets:        v.sets || null,
      reps:        v.reps || null,
      duration:    v.duration || null,
      restSeconds: v.restSeconds,
      loadPercent: v.loadPercent || null,
      coachNotes:  v.coachNotes || null,
    };

    if (this.drawerMode() === 'add') {
      this.api.addExercise(this.activeSessionId()!, dto).subscribe({
        next: newEx => {
          this.patchExerciseInPlan(this.activeSessionId()!, null, newEx);
          this.closeDrawer();
        },
        error: () => this.savingExercise.set(false),
      });
    } else {
      const exId = this.editingExercise()!.id;
      this.api.updateExercise(exId, dto).subscribe({
        next: updated => {
          this.patchExerciseInPlan(this.activeSessionId()!, exId, updated);
          this.closeDrawer();
        },
        error: () => this.savingExercise.set(false),
      });
    }
  }

  deleteExercise(ex: Exercise, sessionId: string): void {
    this.api.deleteExercise(ex.id).subscribe({
      next: () => this.patchExerciseInPlan(sessionId, ex.id, null),
    });
  }

  closeDrawer(): void {
    this.showExerciseDrawer.set(false);
    this.savingExercise.set(false);
    this.editingExercise.set(null);
  }

  private patchExerciseInPlan(sessionId: string, exId: string | null, value: Exercise | null): void {
    this.plan.update(p => {
      if (!p) return p;
      const clone = JSON.parse(JSON.stringify(p)) as TrainingPlan;
      for (const w of clone.weeks) {
        for (const d of w.days) {
          for (const s of d.sessions) {
            if (s.id !== sessionId) continue;
            if (exId === null && value) {
              // add
              s.exercises.push(value);
            } else if (exId && value) {
              // update
              const i = s.exercises.findIndex(e => e.id === exId);
              if (i !== -1) s.exercises[i] = value;
            } else if (exId && !value) {
              // delete
              s.exercises = s.exercises.filter(e => e.id !== exId);
            }
          }
        }
      }
      return clone;
    });
  }

  // ── Publish / Draft ──────────────────────────────────────────────────────

  initializePlan(): void {
    const p = this.plan();
    if (!p || this.initializingPlan()) return;
    this.initializingPlan.set(true);
    this.api.initializePlan(p.id).subscribe({
      next: updated => {
        this.plan.set(updated);
        this.initializingPlan.set(false);
        this.showToast('Estrutura de semanas criada com sucesso!');
      },
      error: () => {
        this.initializingPlan.set(false);
        this.showToast('Erro ao inicializar semanas.');
      },
    });
  }

  saveDraft(): void {
    this.showToast('Rascunho salvo. Todas as alterações já são salvas automaticamente.');
  }

  publish(): void {
    const p = this.plan();
    if (!p) return;
    if (p.published) { this.showToast('Este plano já está publicado.'); return; }
    this.publishing.set(true);
    this.api.publishPlan(p.id).subscribe({
      next: updated => {
        this.plan.update(cur => cur ? { ...cur, published: updated.published } : cur);
        this.publishing.set(false);
        this.showToast('Plano publicado! O atleta já pode visualizar.');
      },
      error: () => {
        this.publishing.set(false);
        this.showToast('Erro ao publicar. Tente novamente.');
      },
    });
  }

  private showToast(msg: string): void {
    this.toastMsg.set(msg);
    setTimeout(() => this.toastMsg.set(''), 3500);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  getTypeColor(type: SessionType): string {
    return this.typeColors[type] ?? 'bg-surface-container text-on-surface-variant';
  }

  formatReps(ex: Exercise): string {
    const parts: string[] = [];
    if (ex.sets) parts.push(`${ex.sets}×`);
    if (ex.reps) parts.push(String(ex.reps));
    if (ex.duration) parts.push(ex.duration);
    return parts.join(' ') || '—';
  }
}
