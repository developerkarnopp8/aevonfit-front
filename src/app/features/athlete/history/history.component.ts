import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, WorkoutLogEntry } from '../../../core/services/api.service';

interface CalendarDay { date: number; completed: boolean; hasWorkout: boolean; }

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss'
})
export class HistoryComponent implements OnInit {
  loading = signal(true);
  logs    = signal<WorkoutLogEntry[]>([]);

  weekDays = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  streak = computed(() => this.calcStreak(this.logs()));
  monthCompletion = computed(() => this.calcMonthCompletion(this.logs()));
  calendar = computed(() => this.buildCalendar(this.logs()));

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getWorkoutHistory().subscribe({
      next: logs => { this.logs.set(logs); this.loading.set(false); },
      error: ()  => this.loading.set(false),
    });
  }

  getMonthName(): string {
    return new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  private toDateKey(d: Date): string {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  private calcStreak(logs: WorkoutLogEntry[]): number {
    const doneSet = new Set(logs.map(l => this.toDateKey(l.completedAt)));
    let streak = 0;
    const today = new Date();
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    while (doneSet.has(this.toDateKey(d))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }

  private calcMonthCompletion(logs: WorkoutLogEntry[]): number {
    const today = new Date();
    const year  = today.getFullYear();
    const month = today.getMonth();
    const daysElapsed = today.getDate();
    const doneSet = new Set(
      logs
        .filter(l => l.completedAt.getFullYear() === year && l.completedAt.getMonth() === month)
        .map(l => l.completedAt.getDate())
    );
    if (daysElapsed === 0) return 0;
    return Math.round((doneSet.size / daysElapsed) * 100);
  }

  private buildCalendar(logs: WorkoutLogEntry[]): CalendarDay[] {
    const today = new Date();
    const year  = today.getFullYear();
    const month = today.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const doneSet = new Set(
      logs
        .filter(l => l.completedAt.getFullYear() === year && l.completedAt.getMonth() === month)
        .map(l => l.completedAt.getDate())
    );

    // Days with workouts = days that have passed (past + today are "workout days" in the context
    // of tracking; days in future are not shown as workout days)
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const isPast = day <= today.getDate();
      return {
        date:       day,
        completed:  doneSet.has(day),
        hasWorkout: isPast,
      };
    });
  }
}
