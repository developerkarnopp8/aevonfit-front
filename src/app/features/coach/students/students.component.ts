import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MockDataService } from '../../../core/services/mock-data.service';
import { AuthService } from '../../../core/services/auth.service';
import { Student } from '../../../core/models';

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './students.component.html',
  styleUrl: './students.component.scss'
})
export class StudentsComponent implements OnInit {
  students = signal<Student[]>([]);
  search = signal('');
  showModal = signal(false);

  filtered = computed(() =>
    this.students().filter(s =>
      s.name.toLowerCase().includes(this.search().toLowerCase()) ||
      s.email.toLowerCase().includes(this.search().toLowerCase())
    )
  );

  form!: FormGroup;

  constructor(
    private data: MockDataService,
    private auth: AuthService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      name:  ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      goal:  ['', Validators.required],
    });
  }

  ngOnInit(): void {
    const coach = this.auth.currentUser();
    if (!coach) return;
    this.data.getStudents(coach.id).subscribe(s => this.students.set(s));
  }

  getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }

  saveStudent(): void {
    if (this.form.invalid) return;
    const v = this.form.value as { name: string; email: string; goal: string };
    const newStudent: Student = {
      id: `athlete-${Date.now()}`,
      name: v.name,
      email: v.email,
      goal: v.goal,
      currentMonth: 1,
      currentWeek: 1,
      coachId: this.auth.currentUser()?.id ?? '',
      completionPercent: 0
    };
    this.students.update(s => [...s, newStudent]);
    this.showModal.set(false);
    this.form.reset();
  }
}
