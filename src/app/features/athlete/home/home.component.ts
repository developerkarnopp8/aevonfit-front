import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Session } from '../../../core/models';

const WATER_TAP_ML = 250;

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  todaySessions = signal<Session[]>([]);
  greeting = signal('Boa tarde');

  /** % real de sessões de hoje já concluídas — mesmo critério (session.status) usado no Cronograma abaixo */
  dailyGoalPercent = computed(() => {
    const sessions = this.todaySessions();
    if (!sessions.length) return 0;
    const done = sessions.filter(s => s.status === 'done').length;
    return Math.round((done / sessions.length) * 100);
  });

  hydrationMl = signal(0);
  hydration = computed(() => (this.hydrationMl() / 1000).toFixed(1));
  calories = signal(0);

  addingCalories = signal(false);
  calorieInput = signal<number | null>(null);
  loggingWater = signal(false);
  loggingCalories = signal(false);

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

    this.api.getTodayIntake().subscribe(t => {
      this.hydrationMl.set(t.hydrationMl);
      this.calories.set(t.calories);
    });
  }

  addWater(): void {
    if (this.loggingWater()) return;
    this.loggingWater.set(true);
    this.api.logHydration(WATER_TAP_ML).subscribe({
      next: () => { this.hydrationMl.update(v => v + WATER_TAP_ML); this.loggingWater.set(false); },
      error: () => this.loggingWater.set(false),
    });
  }

  openCalorieInput(): void {
    this.calorieInput.set(null);
    this.addingCalories.set(true);
  }

  cancelCalorieInput(): void {
    this.addingCalories.set(false);
  }

  confirmCalories(): void {
    const kcal = this.calorieInput();
    if (!kcal || kcal <= 0 || this.loggingCalories()) return;
    this.loggingCalories.set(true);
    this.api.logCalories(kcal).subscribe({
      next: () => {
        this.calories.update(v => v + kcal);
        this.addingCalories.set(false);
        this.calorieInput.set(null);
        this.loggingCalories.set(false);
      },
      error: () => this.loggingCalories.set(false),
    });
  }

  getWeekDay(): string {
    return new Date().toLocaleDateString('pt-BR', { weekday: 'long' });
  }

  isNextSession(session: Session): boolean {
    const pending = this.todaySessions().filter(s => s.status === 'none');
    return pending.length > 0 && pending[0].id === session.id;
  }
}
