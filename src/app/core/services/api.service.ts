import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  Student, TrainingPlan, Session, Exercise, WorkoutLog,
} from '../models';
import { environment } from '../../../environments/environment';

// ── Raw shapes returned by the backend ──────────────────────────────────────

interface RawStudent {
  id: string;
  userId: string;
  coachId: string;
  goal: string;
  currentMonth: number;
  currentWeek: number;
  completionPercent?: number;
  avatarUrl?: string;
  user: { id: string; name: string; email: string; role: string };
}

interface RawExercise {
  id: string;
  sessionId: string;
  name: string;
  youtubeUrl?: string | null;
  sets?: number | null;
  reps?: string | null;
  duration?: string | null;
  restSeconds?: number | null;
  loadPercent?: number | null;
  coachNotes?: string | null;
  order: number;
  workoutLogs?: { id: string }[];
}

interface RawSession {
  id: string;
  dayId: string;
  name: string;
  type: string;
  order: number;
  exercises: RawExercise[];
}

interface RawDay {
  id: string;
  weekId: string;
  dayOfWeek: string;
  dayIndex: number;
  sessions: RawSession[];
}

interface RawWeek {
  id: string;
  planId: string;
  weekNumber: number;
  days: RawDay[];
}

interface RawPlan {
  id: string;
  studentId: string;
  coachId: string;
  month: number;
  title: string;
  published: boolean;
  weeks: RawWeek[];
}

// ── Service ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── Students ──────────────────────────────────────────────────────────────

  /** Coach: lista todos os alunos */
  getStudents(coachId?: string): Observable<Student[]> {
    const url = coachId
      ? `${this.base}/students?coachId=${coachId}`
      : `${this.base}/students`;
    return this.http
      .get<RawStudent[]>(url)
      .pipe(map(list => list.map(s => this.mapStudent(s))));
  }

  /** Atleta: retorna o próprio perfil de aluno */
  getMyStudentProfile(): Observable<Student> {
    return this.http
      .get<RawStudent>(`${this.base}/students/me`)
      .pipe(map(s => this.mapStudent(s)));
  }

  /** Coach: retorna aluno + plano ativo */
  getStudentWithPlan(studentId: string): Observable<{ student: Student; plan: TrainingPlan | null }> {
    return this.http
      .get<{ student: RawStudent; plan: RawPlan | null }>(`${this.base}/students/${studentId}/plan`)
      .pipe(
        map(r => ({
          student: this.mapStudent(r.student),
          plan: r.plan ? this.mapPlan(r.plan) : null,
        })),
      );
  }

  // ── Training Plans ────────────────────────────────────────────────────────

  /** Retorna plano completo por ID */
  getPlanById(planId: string): Observable<TrainingPlan> {
    return this.http
      .get<RawPlan>(`${this.base}/training-plans/${planId}`)
      .pipe(map(p => this.mapPlan(p)));
  }

  /** Retorna todos os planos de um aluno */
  getPlansByStudent(studentId: string): Observable<TrainingPlan[]> {
    return this.http
      .get<RawPlan[]>(`${this.base}/training-plans/student/${studentId}`)
      .pipe(map(list => list.map(p => this.mapPlan(p))));
  }

  /** Retorna o primeiro plano do aluno (mais usado no front) */
  getFirstPlanByStudent(studentId: string): Observable<TrainingPlan | null> {
    return this.getPlansByStudent(studentId).pipe(
      map(plans => plans[0] ?? null),
    );
  }

  // ── Sessions ──────────────────────────────────────────────────────────────

  getSession(id: string): Observable<Session> {
    return this.http
      .get<RawSession & { exercises: RawExercise[] }>(`${this.base}/sessions/${id}`)
      .pipe(map(s => this.mapSession(s)));
  }

  // ── Workout Logs ──────────────────────────────────────────────────────────

  logExercise(exerciseId: string, setsCompleted: number, notes?: string): Observable<WorkoutLog> {
    return this.http.post<WorkoutLog>(`${this.base}/workout-logs`, {
      exerciseId,
      setsCompleted,
      notes,
    });
  }

  // ── Mappers ───────────────────────────────────────────────────────────────

  private mapStudent(s: RawStudent): Student {
    return {
      id:                s.id,
      name:              s.user.name,
      email:             s.user.email,
      goal:              s.goal,
      currentMonth:      s.currentMonth,
      currentWeek:       s.currentWeek,
      coachId:           s.coachId,
      completionPercent: s.completionPercent,
      avatarUrl:         s.avatarUrl,
    };
  }

  private mapPlan(p: RawPlan): TrainingPlan {
    return {
      id:        p.id,
      studentId: p.studentId,
      coachId:   p.coachId,
      month:     p.month,
      title:     p.title,
      published: p.published,
      weeks:     (p.weeks ?? []).map(w => ({
        id:         w.id,
        weekNumber: w.weekNumber,
        days:       (w.days ?? []).map(d => ({
          id:         d.id,
          dayOfWeek:  d.dayOfWeek,
          dayIndex:   d.dayIndex,
          sessions:   (d.sessions ?? []).map(s => this.mapSession(s)),
        })),
      })),
    };
  }

  private mapSession(s: RawSession): Session {
    return {
      id:        s.id,
      name:      s.name,
      type:      s.type as Session['type'],
      order:     s.order,
      exercises: (s.exercises ?? []).map(e => this.mapExercise(e)),
    };
  }

  private mapExercise(e: RawExercise): Exercise {
    return {
      id:           e.id,
      name:         e.name,
      youtubeUrl:   e.youtubeUrl ?? undefined,
      sets:         e.sets ?? undefined,
      reps:         e.reps ?? undefined,
      duration:     e.duration ?? undefined,
      restSeconds:  e.restSeconds ?? undefined,
      loadPercent:  e.loadPercent ?? undefined,
      coachNotes:   e.coachNotes ?? undefined,
      completed:    e.workoutLogs ? e.workoutLogs.length > 0 : false,
    };
  }
}
