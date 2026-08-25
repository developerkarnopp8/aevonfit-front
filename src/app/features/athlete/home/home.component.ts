import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Session } from '../../../core/models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  todaySessions = signal<Session[]>([]);
  greeting = signal('Boa tarde');
  dailyGoalPercent = signal(65);
  hydration = signal(1.8);
  calories = signal(1420);

  constructor(private api: ApiService, public auth: AuthService) {}

  ngOnInit(): void {
    const h = new Date().getHours();
    this.greeting.set(h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite');

    this.api.getMyStudentProfile().subscribe({
      next: student => {
        this.api.getPlansByStudent(student.id).subscribe({
          next: plans => {
            if (!plans.length) return;
            const plan = plans.find(p => p.month === student.currentMonth) ?? plans[0];
            const week = plan.weeks.find(w => w.weekNumber === student.currentWeek) ?? plan.weeks[0];
            const dayIndex = new Date().getDay();
            const day = week?.days.find(d => d.dayIndex === dayIndex) ?? week?.days[0];
            this.todaySessions.set(day?.sessions ?? []);
          },
        });
      },
    });
  }

  getWeekDay(): string {
    return new Date().toLocaleDateString('pt-BR', { weekday: 'long' });
  }
}
