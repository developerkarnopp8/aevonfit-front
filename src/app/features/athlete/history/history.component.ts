import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface CalendarDay { date: number; completed: boolean; hasWorkout: boolean; }

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss'
})
export class HistoryComponent {
  streak = signal(12);
  monthCompletion = signal(84);
  weekDays = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

  calendar = signal<CalendarDay[]>(this.buildCalendar());

  private buildCalendar(): CalendarDay[] {
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const completed = new Set([1,2,3,5,6,8,9,10,11,12,15,16,17,18,19]);
    return Array.from({ length: daysInMonth }, (_, i) => ({
      date: i + 1,
      completed: completed.has(i + 1),
      hasWorkout: ![4,7,13,14].includes(i + 1)
    }));
  }

  getMonthName(): string {
    return new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }
}
