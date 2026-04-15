import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
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
    private api: ApiService,
    private auth: AuthService,
    private fb: FormBuilder,
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
    this.api.getStudents(coach.id).subscribe(s => this.students.set(s));
  }

  getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }

  saveStudent(): void {
    if (this.form.invalid) return;
    // TODO: integrar com POST /api/students quando o fluxo de criação de conta atleta estiver pronto
    this.showModal.set(false);
    this.form.reset();
  }
}
