import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { TrainingPlan, TrainingDay } from '../../../core/models';
import { PlanCalendarModalComponent } from '../../../shared/components/plan-calendar-modal/plan-calendar-modal.component';
import { toLocalDateKey } from '../../../shared/utils/date-key';
import { exportWeekToPdf, exportMonthToPdf } from '../../../shared/utils/plan-pdf-export';

@Component({
  selector: 'app-weekly-view',
  standalone: true,
  imports: [CommonModule, RouterLink, PlanCalendarModalComponent],
  templateUrl: './weekly-view.component.html',
  styleUrl: './weekly-view.component.scss'
})
export class WeeklyViewComponent implements OnInit {
  plan = signal<TrainingPlan | null>(null);
  selectedWeek = signal(0);
  selectedDay = signal<TrainingDay | null>(null);
  allPlans = signal<TrainingPlan[]>([]);
  workoutDates = signal<Set<string>>(new Set());
  showCalendarModal = signal(false);

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit(): void {
    this.api.getMyStudentProfile().subscribe({
      next: student => {
        this.api.getPlansByStudent(student.id).subscribe({
          next: plans => {
            this.allPlans.set(plans);
            if (!plans.length) return;
            const plan = plans.find(p => p.month === student.currentMonth) ?? plans[0];
            this.plan.set(plan);

            const weekIndex = plan.weeks.findIndex(w => w.weekNumber === student.currentWeek);
            this.selectedWeek.set(weekIndex >= 0 ? weekIndex : 0);

            const week = plan.weeks.at(weekIndex >= 0 ? weekIndex : 0);
            const today = week?.days.find(d => d.dayIndex === new Date().getDay());
            this.selectedDay.set(today ?? week?.days[0] ?? null);
          },
        });
        this.api.getWorkoutHistory(500).subscribe(logs => {
          // toLocalDateKey (não toDateKey/UTC): completedAt é um timestamp
          // real de quando o atleta registrou o treino — o "dia" dele é o
          // dia local do atleta, não o dia UTC do instante.
          this.workoutDates.set(new Set(logs.map(l => toLocalDateKey(l.completedAt))));
        });
      },
    });
  }

  selectDay(day: TrainingDay): void { this.selectedDay.set(day); }

  exportCurrentWeekPdf(): void {
    const p = this.plan();
    const weekNumber = p?.weeks.at(this.selectedWeek())?.weekNumber;
    if (!p || weekNumber == null) return;
    this.api.getWorkoutHistory(500).subscribe(logs =>
      exportWeekToPdf(p, weekNumber, this.auth.currentUser()?.name ?? '', logs));
  }

  exportCurrentMonthPdf(): void {
    const p = this.plan();
    if (!p) return;
    this.api.getWorkoutHistory(500).subscribe(logs =>
      exportMonthToPdf(p, this.auth.currentUser()?.name ?? '', logs));
  }

  onCalendarDaySelected(sel: { planId: string; weekNumber: number }): void {
    this.showCalendarModal.set(false);
    const target = this.allPlans().find(p => p.id === sel.planId);
    if (!target) return;
    this.plan.set(target);
    const idx = target.weeks.findIndex(w => w.weekNumber === sel.weekNumber);
    this.selectedWeek.set(idx >= 0 ? idx : 0);
    const week = target.weeks.at(idx >= 0 ? idx : 0);
    this.selectedDay.set(week?.days[0] ?? null);
  }

  getCompletionForDay(day: TrainingDay): number {
    const all = day.sessions.flatMap(s => s.exercises);
    if (!all.length) return 0;
    return Math.round((all.filter(e => e.completed).length / all.length) * 100);
  }

  isToday(day: TrainingDay): boolean {
    return day.dayIndex === new Date().getDay();
  }
}
