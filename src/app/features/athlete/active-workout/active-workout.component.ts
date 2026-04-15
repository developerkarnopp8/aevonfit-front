import { Component, OnInit, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { Session, Exercise } from '../../../core/models';
import { Subject, interval, takeUntil } from 'rxjs';

type Phase = 'exercise' | 'rest' | 'done';

@Component({
  selector: 'app-active-workout',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './active-workout.component.html',
  styleUrl: './active-workout.component.scss'
})
export class ActiveWorkoutComponent implements OnInit, OnDestroy {
  session      = signal<Session | null>(null);
  currentIndex = signal(0);
  phase        = signal<Phase>('exercise');

  // ── Exercise timer (countdown for duration-based exercises)
  exSecs    = signal(0);
  exTarget  = signal(0);
  exRunning = signal(false);
  exPaused  = signal(false);

  // ── Rest timer
  restSecs   = signal(0);
  restTarget = signal(0);
  restPaused = signal(false);

  private destroy$   = new Subject<void>();
  private timerStop$ = new Subject<void>();

  currentExercise = computed(() => {
    const s = this.session();
    return s ? (s.exercises[this.currentIndex()] ?? null) : null;
  });

  nextExercise = computed(() => {
    const s = this.session();
    if (!s) return null;
    return s.exercises[this.currentIndex() + 1] ?? null;
  });

  /** true when the exercise has a parseable duration > 0 */
  hasDuration = computed(() => {
    const ex = this.currentExercise();
    return !!ex?.duration && this.parseDuration(ex.duration) > 0;
  });

  exProgress = computed(() => {
    const t = this.exTarget();
    return t ? ((t - this.exSecs()) / t) * 100 : 0;
  });

  restProgress = computed(() => {
    const t = this.restTarget();
    return t ? ((t - this.restSecs()) / t) * 100 : 0;
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('sessionId') ?? '';
    this.api.getSession(id).subscribe(s => {
      this.session.set(s);
      this.enterExercise();
    });
  }

  ngOnDestroy(): void {
    this.timerStop$.next();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  exitWorkout(): void {
    this.stopTimers();
    const s = this.session();
    this.router.navigate(s ? ['/athlete/session', s.id] : ['/athlete/home']);
  }

  // ── Exercise phase ─────────────────────────────────────────────────────────

  private enterExercise(): void {
    this.stopTimers();
    const ex = this.currentExercise();
    if (!ex) { this.phase.set('done'); return; }

    this.phase.set('exercise');
    const secs = this.parseDuration(ex.duration ?? '');
    this.exTarget.set(secs);
    this.exSecs.set(secs);
    this.exRunning.set(false);
    this.exPaused.set(false);
  }

  startTimer(): void {
    if (this.exRunning()) return;
    this.exRunning.set(true);
    this.exPaused.set(false);

    interval(1000).pipe(takeUntil(this.timerStop$)).subscribe(() => {
      if (this.exPaused()) return;
      const cur = this.exSecs();
      if (cur <= 1) {
        this.exSecs.set(0);
        this.exRunning.set(false);
        this.onExerciseDone();
      } else {
        this.exSecs.set(cur - 1);
      }
    });
  }

  toggleExPause(): void { this.exPaused.update(v => !v); }

  /** Athlete manually marks exercise as done (no-duration flow) */
  checkin(): void { this.onExerciseDone(); }

  skipExercise(): void {
    this.stopTimers();
    this.advance();
  }

  private onExerciseDone(): void {
    // Log to backend
    const ex = this.currentExercise();
    if (ex) {
      this.api.logExercise(ex.id, ex.sets ?? 1).subscribe();
      this.session.update(s => {
        if (!s) return s;
        return {
          ...s,
          exercises: s.exercises.map((e, i) =>
            i === this.currentIndex() ? { ...e, completed: true } : e
          ),
        };
      });
    }

    const rest = ex?.restSeconds ?? 0;
    if (rest > 0) {
      this.enterRest(rest);
    } else {
      this.advance();
    }
  }

  // ── Rest phase ─────────────────────────────────────────────────────────────

  private enterRest(seconds: number): void {
    this.stopTimers();
    this.restTarget.set(seconds);
    this.restSecs.set(seconds);
    this.restPaused.set(false);
    this.phase.set('rest');

    interval(1000).pipe(takeUntil(this.timerStop$)).subscribe(() => {
      if (this.restPaused()) return;
      const cur = this.restSecs();
      if (cur <= 1) {
        this.restSecs.set(0);
        this.advance();
      } else {
        this.restSecs.set(cur - 1);
      }
    });
  }

  toggleRestPause(): void { this.restPaused.update(v => !v); }

  skipRest(): void { this.stopTimers(); this.advance(); }

  // ── Advance ────────────────────────────────────────────────────────────────

  private advance(): void {
    const s = this.session();
    if (!s) return;
    if (this.currentIndex() < s.exercises.length - 1) {
      this.currentIndex.update(i => i + 1);
      this.enterExercise();
    } else {
      this.stopTimers();
      this.phase.set('done');
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private stopTimers(): void { this.timerStop$.next(); }

  formatTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }

  /** Parse "1:30" | "90s" | "2min" | "45" → seconds */
  parseDuration(d: string): number {
    if (!d) return 0;
    const s = d.toLowerCase().trim();
    let m: RegExpMatchArray | null;
    if ((m = s.match(/^(\d+):(\d+)$/))) return +m[1] * 60 + +m[2];
    if ((m = s.match(/^(\d+)\s*min$/)))  return +m[1] * 60;
    if ((m = s.match(/^(\d+)\s*s$/)))    return +m[1];
    if ((m = s.match(/^(\d+)$/)))         return +m[1];
    return 0;
  }

  formatReps(ex: Exercise): string {
    const parts: string[] = [];
    if (ex.sets)     parts.push(`${ex.sets}×`);
    if (ex.reps)     parts.push(String(ex.reps));
    if (ex.duration) parts.push(ex.duration);
    return parts.join(' ') || '—';
  }
}
