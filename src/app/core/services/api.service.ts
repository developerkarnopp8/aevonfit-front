import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  Student, TrainingPlan, Session, Exercise, WorkoutLog,
  ExerciseLibraryItem, Payment, PaymentSummary,
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

interface RawWorkoutLog {
  id: string;
  exerciseId: string;
  athleteId: string;
  setsCompleted: number;
  notes?: string | null;
  completedAt: string;
  exercise?: {
    id: string;
    name: string;
    session?: {
      id: string;
      name: string;
      type: string;
      day?: { dayOfWeek: string; week?: { weekNumber: number } };
    };
  };
}

export interface ChatMessage {
  id: string;
  fromId: string;
  toId: string;
  content: string;
  read: boolean;
  createdAt: string;
  from: { id: string; name: string; role: string };
  to:   { id: string; name: string; role: string };
}

export interface WorkoutLogEntry {
  id: string;
  exerciseId: string;
  exerciseName: string;
  sessionName: string;
  sessionType: string;
  completedAt: Date;
  setsCompleted: number;
  notes?: string;
}

// ── Service ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // ── Students ──────────────────────────────────────────────────────────────

  /** Coach: cria conta de atleta + perfil de aluno em uma única chamada */
  createStudent(dto: { name: string; email: string; password: string; goal: string }): Observable<Student> {
    return this.http
      .post<{ id: string; user: { name: string; email: string }; goal: string; currentWeek: number; currentMonth: number; completionPercent?: number }>(
        `${this.base}/students`, dto,
      )
      .pipe(map(s => ({
        id:                s.id,
        name:              s.user.name,
        email:             s.user.email,
        goal:              s.goal,
        currentWeek:       s.currentWeek,
        currentMonth:      s.currentMonth,
        coachId:           '',
        completionPercent: s.completionPercent,
      })));
  }

  /** Coach: lista todos os alunos */
  getStudents(coachId?: string): Observable<Student[]> {
    const url = coachId
      ? `${this.base}/students?coachId=${coachId}`
      : `${this.base}/students`;
    return this.http
      .get<RawStudent[]>(url)
      .pipe(map(list => list.map(s => this.mapStudent(s))));
  }

  /** Coach: atualiza objetivo/progresso do aluno */
  updateStudent(id: string, dto: { goal?: string; currentWeek?: number; currentMonth?: number }): Observable<Student> {
    return this.http
      .patch<RawStudent>(`${this.base}/students/${id}`, dto)
      .pipe(map(s => this.mapStudent(s)));
  }

  /** Coach: remove aluno e conta de usuário */
  deleteStudent(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/students/${id}`);
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

  /** Inicializa 4 semanas × 6 dias para um plano sem semanas */
  initializePlan(planId: string): Observable<TrainingPlan> {
    return this.http
      .post<RawPlan>(`${this.base}/training-plans/${planId}/initialize`, {})
      .pipe(map(p => this.mapPlan(p)));
  }

  /** Publica o plano para o atleta */
  publishPlan(planId: string): Observable<TrainingPlan> {
    return this.http
      .patch<RawPlan>(`${this.base}/training-plans/${planId}/publish`, {})
      .pipe(map(p => this.mapPlan(p)));
  }

  /** Retorna todos os planos de um aluno */
  getPlansByStudent(studentId: string): Observable<TrainingPlan[]> {
    return this.http
      .get<RawPlan[]>(`${this.base}/training-plans/student/${studentId}`)
      .pipe(map(list => list.map(p => this.mapPlan(p))));
  }

  /** Cria novo plano de treino para um aluno */
  createPlan(studentId: string, title: string, month: number): Observable<TrainingPlan> {
    return this.http
      .post<RawPlan>(`${this.base}/training-plans`, { studentId, title, month })
      .pipe(map(p => this.mapPlan(p)));
  }

  /** Retorna o primeiro plano do aluno (mais usado no front) */
  getFirstPlanByStudent(studentId: string): Observable<TrainingPlan | null> {
    return this.getPlansByStudent(studentId).pipe(
      map(plans => plans[0] ?? null),
    );
  }

  // ── Sessions (plan-builder) ───────────────────────────────────────────────

  addSession(dayId: string, name: string, type: string): Observable<Session> {
    return this.http
      .post<RawSession>(`${this.base}/training-plans/days/${dayId}/sessions`, { name, type, order: 0 })
      .pipe(map(s => this.mapSession(s)));
  }

  deleteSession(sessionId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/training-plans/sessions/${sessionId}`);
  }

  // ── Exercises (plan-builder) ──────────────────────────────────────────────

  addExercise(sessionId: string, dto: Partial<RawExercise>): Observable<Exercise> {
    return this.http
      .post<RawExercise>(`${this.base}/training-plans/sessions/${sessionId}/exercises`, dto)
      .pipe(map(e => this.mapExercise(e)));
  }

  updateExercise(exerciseId: string, dto: Partial<RawExercise>): Observable<Exercise> {
    return this.http
      .patch<RawExercise>(`${this.base}/training-plans/exercises/${exerciseId}`, dto)
      .pipe(map(e => this.mapExercise(e)));
  }

  deleteExercise(exerciseId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/training-plans/exercises/${exerciseId}`);
  }

  // ── Sessions ──────────────────────────────────────────────────────────────

  getSession(id: string): Observable<Session> {
    return this.http
      .get<RawSession & { exercises: RawExercise[] }>(`${this.base}/sessions/${id}`)
      .pipe(map(s => this.mapSession(s)));
  }

  // ── Exercise Library ─────────────────────────────────────────────────────

  getLibrary(): Observable<ExerciseLibraryItem[]> {
    return this.http.get<ExerciseLibraryItem[]>(`${this.base}/exercise-library`);
  }

  createLibraryItem(dto: Partial<ExerciseLibraryItem>): Observable<ExerciseLibraryItem> {
    return this.http.post<ExerciseLibraryItem>(`${this.base}/exercise-library`, dto);
  }

  updateLibraryItem(id: string, dto: Partial<ExerciseLibraryItem>): Observable<ExerciseLibraryItem> {
    return this.http.patch<ExerciseLibraryItem>(`${this.base}/exercise-library/${id}`, dto);
  }

  deleteLibraryItem(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/exercise-library/${id}`);
  }

  // ── Payments ──────────────────────────────────────────────────────────────

  getPayments(): Observable<Payment[]> {
    return this.http.get<Payment[]>(`${this.base}/payments`);
  }

  getPaymentSummary(): Observable<PaymentSummary> {
    return this.http.get<PaymentSummary>(`${this.base}/payments/summary`);
  }

  createPayment(dto: { studentId: string; amount: number; dueDate: string; description?: string }): Observable<Payment> {
    return this.http.post<Payment>(`${this.base}/payments`, dto);
  }

  markPaymentPaid(id: string): Observable<Payment> {
    return this.http.patch<Payment>(`${this.base}/payments/${id}/pay`, {});
  }

  deletePayment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/payments/${id}`);
  }

  // ── Workout Logs ──────────────────────────────────────────────────────────

  logExercise(exerciseId: string, setsCompleted: number, notes?: string): Observable<WorkoutLog> {
    return this.http.post<WorkoutLog>(`${this.base}/workout-logs`, {
      exerciseId,
      setsCompleted,
      notes,
    });
  }

  // ── Messages ──────────────────────────────────────────────────────────────

  getInbox(): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.base}/messages/inbox`);
  }

  getConversation(otherId: string): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.base}/messages/${otherId}`);
  }

  sendMessage(toId: string, content: string): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(`${this.base}/messages`, { toId, content });
  }

  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.base}/messages/unread`);
  }

  /** Atleta: histórico completo de treinos */
  getWorkoutHistory(limit = 200): Observable<WorkoutLogEntry[]> {
    return this.http
      .get<RawWorkoutLog[]>(`${this.base}/workout-logs/history?limit=${limit}`)
      .pipe(map(list => list.map(l => ({
        id:           l.id,
        exerciseId:   l.exerciseId,
        exerciseName: l.exercise?.name ?? '',
        sessionName:  l.exercise?.session?.name ?? '',
        sessionType:  l.exercise?.session?.type ?? '',
        completedAt:  new Date(l.completedAt),
        setsCompleted: l.setsCompleted,
        notes:        l.notes ?? undefined,
      }))));
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
