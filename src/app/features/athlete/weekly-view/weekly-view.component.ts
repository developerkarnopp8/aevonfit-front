import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MockDataService } from '../../../core/services/mock-data.service';
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

  constructor(private data: MockDataService, private auth: AuthService) {}

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (!user) return;
    this.data.getPlanByStudentId(user.id).subscribe(p => {
      if (p) { this.plan.set(p); this.selectedDay.set(p.weeks[0]?.days[0] ?? null); }
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
