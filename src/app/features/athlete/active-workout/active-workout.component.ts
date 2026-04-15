import { Component, OnInit, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { Session, Exercise } from '../../../core/models';
import { Subject, interval, takeUntil } from 'rxjs';

@Component({
  selector: 'app-active-workout',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './active-workout.component.html',
  styleUrl: './active-workout.component.scss'
})
export class ActiveWorkoutComponent implements OnInit, OnDestroy {
  session = signal<Session | null>(null);
  currentIndex = signal(0);
  restActive = signal(false);
  restSeconds = signal(0);
  restTarget = signal(90);

  private destroy$ = new Subject<void>();

  currentExercise = computed(() => {
    const s = this.session();
    if (!s) return null;
    return s.exercises[this.currentIndex()] ?? null;
  });

  constructor(private route: ActivatedRoute, private api: ApiService) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('sessionId') ?? '';
    this.api.getSession(id).subscribe(s => this.session.set(s));
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  complete(): void {
    const ex = this.currentExercise();
    if (!ex) return;
    ex.completed = true;
    this.api.logExercise(ex.id, ex.sets ?? 1).subscribe();
    this.session.update(s => s ? { ...s } : null);
    this.startRest(ex.restSeconds ?? 90);
  }

  skip(): void { this.next(); }

  next(): void {
    const s = this.session();
    if (!s) return;
    if (this.currentIndex() < s.exercises.length - 1) {
      this.currentIndex.update(i => i + 1);
    }
  }

  startRest(seconds: number): void {
    this.destroy$.next();
    this.restTarget.set(seconds);
    this.restSeconds.set(seconds);
    this.restActive.set(true);

    interval(1000).pipe(takeUntil(this.destroy$)).subscribe(() => {
      const cur = this.restSeconds();
      if (cur <= 1) {
        this.restSeconds.set(0);
        this.restActive.set(false);
        this.next();
      } else {
        this.restSeconds.set(cur - 1);
      }
    });
  }

  formatTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
  }

  getProgress(): number {
    const target = this.restTarget();
    return target ? ((target - this.restSeconds()) / target) * 100 : 0;
  }

  formatReps(ex: Exercise): string {
    if (ex.duration) return ex.duration;
    const parts: string[] = [];
    if (ex.sets) parts.push(`${ex.sets}`);
    if (ex.reps) parts.push(`× ${ex.reps}`);
    return parts.join(' ') || '—';
  }
}
