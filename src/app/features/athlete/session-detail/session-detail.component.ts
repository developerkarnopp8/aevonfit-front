import { Component, OnInit, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MockDataService } from '../../../core/services/mock-data.service';
import { Session, Exercise } from '../../../core/models';
import { Subject, interval, takeUntil } from 'rxjs';

@Component({
  selector: 'app-session-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './session-detail.component.html',
  styleUrl: './session-detail.component.scss'
})
export class SessionDetailComponent implements OnInit, OnDestroy {
  session = signal<Session | null>(null);
  timerActive = signal(false);
  timerSeconds = signal(0);
  timerTarget = signal(90);
  timerExercise = signal<Exercise | null>(null);

  private destroy$ = new Subject<void>();

  constructor(private route: ActivatedRoute, private data: MockDataService) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('sessionId') ?? '';
    this.data.getSessionById(id).subscribe(s => { if (s) this.session.set(s); });
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  toggleExercise(ex: Exercise): void {
    ex.completed = !ex.completed;
    this.session.update(s => s ? { ...s } : null);
  }

  startTimer(ex: Exercise): void {
    this.timerExercise.set(ex);
    this.timerTarget.set(ex.restSeconds ?? 90);
    this.timerSeconds.set(ex.restSeconds ?? 90);
    this.timerActive.set(true);

    interval(1000).pipe(takeUntil(this.destroy$)).subscribe(() => {
      const cur = this.timerSeconds();
      if (cur <= 1) {
        this.timerSeconds.set(0);
        this.timerActive.set(false);
      } else {
        this.timerSeconds.set(cur - 1);
      }
    });
  }

  closeTimer(): void { this.timerActive.set(false); this.destroy$.next(); }

  formatTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
  }

  getTimerProgress(): number {
    const target = this.timerTarget();
    return target ? ((target - this.timerSeconds()) / target) * 100 : 0;
  }

  formatReps(ex: Exercise): string {
    if (ex.duration) return ex.duration;
    const parts: string[] = [];
    if (ex.sets) parts.push(`${ex.sets}`);
    if (ex.reps) parts.push(`× ${ex.reps}`);
    return parts.join(' ') || '—';
  }
}
