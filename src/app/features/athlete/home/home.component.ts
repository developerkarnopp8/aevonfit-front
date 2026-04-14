import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MockDataService } from '../../../core/services/mock-data.service';
import { AuthService } from '../../../core/services/auth.service';
import { Session, TrainingPlan } from '../../../core/models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  plan = signal<TrainingPlan | null>(null);
  todaySessions = signal<Session[]>([]);
  greeting = signal('Boa tarde');
  dailyGoalPercent = signal(65);
  hydration = signal(1.8);
  calories = signal(1420);

  typeIcons: Record<string, string> = {
    LPO: '🏋️', Strength: '💪', Gymnastics: '🤸', Metcon: '🔥',
    Endurance: '🏃', Mobility: '🧘', Core: '⚡'
  };

  constructor(private data: MockDataService, public auth: AuthService) {}

  ngOnInit(): void {
    const h = new Date().getHours();
    this.greeting.set(h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite');

    const user = this.auth.currentUser();
    if (!user) return;

    this.data.getPlanByStudentId(user.id).subscribe(plan => {
      if (!plan) return;
      this.plan.set(plan);
      // Pick first week, current day or fallback to first available
      const dayIndex = new Date().getDay();
      const week = plan.weeks[0];
      const day = week?.days.find(d => d.dayIndex === dayIndex) ?? week?.days[0];
      this.todaySessions.set(day?.sessions ?? []);
    });
  }

  getWeekDay(): string {
    return new Date().toLocaleDateString('pt-BR', { weekday: 'long' });
  }

  getCompletedCount(): number {
    return this.todaySessions().filter(s => s.exercises.every(e => e.completed)).length;
  }
}
