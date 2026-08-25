import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { TrainingPlan, TrainingDay } from '../../../core/models';

@Component({
  selector: 'app-weekly-view',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './weekly-view.component.html',
  styleUrl: './weekly-view.component.scss'
})
export class WeeklyViewComponent implements OnInit {
  plan = signal<TrainingPlan | null>(null);
  selectedWeek = signal(0);
  selectedDay = signal<TrainingDay | null>(null);

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit(): void {
    this.api.getMyStudentProfile().subscribe({
      next: student => {
        this.api.getPlansByStudent(student.id).subscribe({
          next: plans => {
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
      },
    });
  }

  selectDay(day: TrainingDay): void { this.selectedDay.set(day); }

  getCompletionForDay(day: TrainingDay): number {
    const all = day.sessions.flatMap(s => s.exercises);
    if (!all.length) return 0;
    return Math.round((all.filter(e => e.completed).length / all.length) * 100);
  }

  isToday(day: TrainingDay): boolean {
    return day.dayIndex === new Date().getDay();
  }
}
