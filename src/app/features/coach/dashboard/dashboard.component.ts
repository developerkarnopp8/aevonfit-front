import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Student } from '../../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  students  = signal<Student[]>([]);
  /** Média do completionPercent (% do plano do MÊS atual, não da semana) entre os alunos do coach */
  monthlyAvg = computed(() => {
    const list = this.students();
    if (!list.length) return 0;
    const total = list.reduce((sum, s) => sum + (s.completionPercent ?? 0), 0);
    return Math.round(total / list.length);
  });

  /** [Dom, Seg, Ter, Qua, Qui, Sex, Sáb] — índice = dayIndex real do backend (0-6) */
  weeklyCompletion = signal<number[]>([0, 0, 0, 0, 0, 0, 0]);
  readonly todayDayIndex = new Date().getDay();

  constructor(private api: ApiService, public auth: AuthService) {}

  ngOnInit(): void {
    const coach = this.auth.currentUser();
    if (!coach) return;
    this.api.getStudents(coach.id).subscribe(s => this.students.set(s));
    this.api.getWeeklyCompletion().subscribe(days => {
      const byIndex = [0, 0, 0, 0, 0, 0, 0];
      for (const d of days) byIndex[d.dayIndex] = d.percent;
      this.weeklyCompletion.set(byIndex);
    });
  }

  getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }
}
