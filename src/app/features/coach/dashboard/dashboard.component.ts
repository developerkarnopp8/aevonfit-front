import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MockDataService } from '../../../core/services/mock-data.service';
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
  students = signal<Student[]>([]);
  weeklyAvg = signal(88);

  constructor(
    private data: MockDataService,
    public auth: AuthService
  ) {}

  ngOnInit(): void {
    const coach = this.auth.currentUser();
    if (!coach) return;
    this.data.getStudents(coach.id).subscribe(s => this.students.set(s));
  }

  getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }
}
