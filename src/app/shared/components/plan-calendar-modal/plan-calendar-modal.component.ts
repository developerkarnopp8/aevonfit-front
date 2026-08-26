import { Component, EventEmitter, Input, Output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TrainingPlan } from '../../../core/models';
import { utcDate, addUtcDays, toDateKey, utcDateFromIso, todayLocalKey } from '../../utils/date-key';

export interface CalendarDay {
  date: Date;
  dateKey: string;
  inCurrentMonth: boolean;
  planId: string | null;
  weekNumber: number | null;
  isToday: boolean;
  hasWorkoutLog: boolean;
}

@Component({
  selector: 'app-plan-calendar-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './plan-calendar-modal.component.html',
  styleUrl: './plan-calendar-modal.component.scss',
})
export class PlanCalendarModalComponent {
  @Input() plans: TrainingPlan[] = [];
  @Input() workoutDates?: Set<string>;
  @Output() daySelected = new EventEmitter<{ planId: string; weekNumber: number }>();
  @Output() closed = new EventEmitter<void>();

  viewedMonth = signal(utcDate(new Date().getFullYear(), new Date().getMonth() + 1, 1));

  /** Mapa "YYYY-MM-DD" -> {planId, weekNumber} pra todo dia (Segunda-Sábado) coberto por algum plano. */
  private coverage = computed(() => {
    const map = new Map<string, { planId: string; weekNumber: number }>();
    for (const plan of this.plans) {
      const monday1 = utcDateFromIso(plan.startDate);
      for (const week of plan.weeks) {
        for (let dayIndex = 1; dayIndex <= 6; dayIndex++) {
          const offset = (week.weekNumber - 1) * 7 + (dayIndex - 1);
          const d = addUtcDays(monday1, offset);
          map.set(toDateKey(d), { planId: plan.id, weekNumber: week.weekNumber });
        }
      }
    }
    return map;
  });

  /** Grid de 6 linhas x 7 colunas (Segunda a Domingo), sempre começando numa Segunda-feira. */
  weeks = computed<CalendarDay[][]>(() => {
    const month = this.viewedMonth();
    const year = month.getUTCFullYear();
    const monthIndex = month.getUTCMonth();
    const firstOfMonth = utcDate(year, monthIndex + 1, 1);
    const dow = firstOfMonth.getUTCDay(); // 0=Dom...6=Sáb
    const startOffset = dow === 0 ? 6 : dow - 1; // dias voltando até a Segunda que inicia a grade
    const gridStart = addUtcDays(firstOfMonth, -startOffset);

    const cov = this.coverage();
    const today = todayLocalKey();
    const wd = this.workoutDates;

    const days: CalendarDay[] = [];
    for (let i = 0; i < 42; i++) {
      const d = addUtcDays(gridStart, i);
      const key = toDateKey(d);
      const hit = cov.get(key) ?? null;
      days.push({
        date: d,
        dateKey: key,
        inCurrentMonth: d.getUTCMonth() === monthIndex,
        planId: hit?.planId ?? null,
        weekNumber: hit?.weekNumber ?? null,
        isToday: key === today,
        hasWorkoutLog: !!wd?.has(key),
      });
    }

    const rows: CalendarDay[][] = [];
    for (let i = 0; i < 42; i += 7) rows.push(days.slice(i, i + 7));
    return rows;
  });

  monthLabel = computed(() => {
    const m = this.viewedMonth();
    return new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), 1))
      .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  });

  prevMonth(): void {
    const m = this.viewedMonth();
    this.viewedMonth.set(utcDate(m.getUTCFullYear(), m.getUTCMonth(), 1));
  }

  nextMonth(): void {
    const m = this.viewedMonth();
    this.viewedMonth.set(utcDate(m.getUTCFullYear(), m.getUTCMonth() + 2, 1));
  }

  selectDay(day: CalendarDay): void {
    if (!day.planId || day.weekNumber == null) return;
    this.daySelected.emit({ planId: day.planId, weekNumber: day.weekNumber });
  }

  close(): void {
    this.closed.emit();
  }
}
