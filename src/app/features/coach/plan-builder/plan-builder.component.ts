import { Component, OnInit, signal, computed, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { TrainingPlan, Exercise, SessionType } from '../../../core/models';

@Component({
  selector: 'app-plan-builder',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './plan-builder.component.html',
  styleUrl: './plan-builder.component.scss'
})
export class PlanBuilderComponent implements OnInit {
  @Input() studentId!: string;

  plan = signal<TrainingPlan | null>(null);
  selectedWeek = signal(0);
  expandedSessions = signal<Set<string>>(new Set());
  showExerciseDrawer = signal(false);
  activeSessionId = signal<string | null>(null);

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
  currentWeek = computed(() => this.plan()?.weeks[this.selectedWeek()] ?? null);

  constructor(private api: ApiService, private fb: FormBuilder) {
    this.exerciseForm = this.fb.group({
      name:        ['', Validators.required],
      youtubeUrl:  [''],
      sets:        [3],
      reps:        [''],
      duration:    [''],
      restSeconds: [90],
      loadPercent: [null as number | null],
      coachNotes:  [''],
    });
  }

  ngOnInit(): void {
    if (!this.studentId) return;
    this.api.getStudentWithPlan(this.studentId).subscribe({
      next: ({ plan }) => { if (plan) this.plan.set(plan); },
    });
  }

  toggleSession(sessionId: string): void {
    this.expandedSessions.update(set => {
      const next = new Set(set);
      next.has(sessionId) ? next.delete(sessionId) : next.add(sessionId);
      return next;
    });
  }

  isExpanded(sessionId: string): boolean {
    return this.expandedSessions().has(sessionId);
  }

  openAddExercise(sessionId: string): void {
    this.activeSessionId.set(sessionId);
    this.exerciseForm.reset({ sets: 3, restSeconds: 90 });
    this.showExerciseDrawer.set(true);
  }

  saveExercise(): void {
    if (this.exerciseForm.invalid || !this.activeSessionId()) return;
    const v = this.exerciseForm.value as {
      name: string; youtubeUrl: string; sets: number; reps: string;
      duration: string; restSeconds: number; loadPercent: number | null; coachNotes: string;
    };

    // TODO: call POST /api/training-plans/sessions/:id/exercises with real backend
    // For now, append locally
    const newEx: Exercise = {
      id:           `ex-${Date.now()}`,
      name:         v.name,
      youtubeUrl:   v.youtubeUrl || undefined,
      sets:         v.sets,
      reps:         v.reps || null,
      duration:     v.duration || null,
      restSeconds:  v.restSeconds,
      loadPercent:  v.loadPercent,
      coachNotes:   v.coachNotes || undefined,
      completed:    false,
    };

    this.plan.update(p => {
      if (!p) return p;
      const clone = JSON.parse(JSON.stringify(p)) as TrainingPlan;
      for (const week of clone.weeks) {
        for (const day of week.days) {
          for (const session of day.sessions) {
            if (session.id === this.activeSessionId()) {
              session.exercises.push(newEx);
            }
          }
        }
      }
      return clone;
    });

    this.showExerciseDrawer.set(false);
  }

  getTypeColor(type: SessionType): string {
    return this.typeColors[type] ?? 'bg-surface-container text-on-surface-variant';
  }

  formatReps(ex: Exercise): string {
    const parts: string[] = [];
    if (ex.sets) parts.push(`${ex.sets}x`);
    if (ex.reps) parts.push(String(ex.reps));
    if (ex.duration) parts.push(ex.duration);
    return parts.join(' ') || '—';
  }
}
