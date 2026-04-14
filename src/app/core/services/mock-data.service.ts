import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of } from 'rxjs';
import { User, Student, TrainingPlan, Session, Exercise, WorkoutLog } from '../models';

interface MockDb {
  users: User[];
  students: Student[];
  trainingPlans: TrainingPlan[];
  workoutLogs: WorkoutLog[];
}

@Injectable({ providedIn: 'root' })
export class MockDataService {
  private readonly dbUrl = 'assets/mock/db.json';
  private cache: MockDb | null = null;

  constructor(private http: HttpClient) {}

  private db(): Observable<MockDb> {
    if (this.cache) return of(this.cache);
    return this.http.get<MockDb>(this.dbUrl).pipe(
      map(db => { this.cache = db; return db; })
    );
  }

  getUsers(): Observable<User[]> {
    return this.db().pipe(map(db => db.users));
  }

  getUserById(id: string): Observable<User | undefined> {
    return this.db().pipe(map(db => db.users.find(u => u.id === id)));
  }

  getStudents(coachId?: string): Observable<Student[]> {
    return this.db().pipe(
      map(db => coachId ? db.students.filter(s => s.coachId === coachId) : db.students)
    );
  }

  getStudentById(id: string): Observable<Student | undefined> {
    return this.db().pipe(map(db => db.students.find(s => s.id === id)));
  }

  getPlanByStudentId(studentId: string): Observable<TrainingPlan | undefined> {
    return this.db().pipe(
      map(db => db.trainingPlans.find(p => p.studentId === studentId))
    );
  }

  getSessionById(sessionId: string): Observable<Session | undefined> {
    return this.db().pipe(map(db => {
      for (const plan of db.trainingPlans) {
        for (const week of plan.weeks) {
          for (const day of week.days) {
            const session = day.sessions.find(s => s.id === sessionId);
            if (session) return session;
          }
        }
      }
      return undefined;
    }));
  }

  getWorkoutLogs(studentId: string): Observable<WorkoutLog[]> {
    return this.db().pipe(
      map(db => db.workoutLogs.filter(l => l.studentId === studentId))
    );
  }

  logCompletion(log: WorkoutLog): Observable<WorkoutLog> {
    if (this.cache) {
      this.cache.workoutLogs.push(log);
    }
    return of(log);
  }

  markExerciseCompleted(sessionId: string, exerciseId: string, completed: boolean): Observable<void> {
    if (this.cache) {
      for (const plan of this.cache.trainingPlans) {
        for (const week of plan.weeks) {
          for (const day of week.days) {
            for (const session of day.sessions) {
              if (session.id === sessionId) {
                const ex = session.exercises.find((e: Exercise) => e.id === exerciseId);
                if (ex) ex.completed = completed;
              }
            }
          }
        }
      }
    }
    return of(void 0);
  }

  getSessionsForToday(studentId: string): Observable<Session[]> {
    const dayIndex = new Date().getDay(); // 0=Sun, 1=Mon...
    return this.getPlanByStudentId(studentId).pipe(
      map(plan => {
        if (!plan) return [];
        const week = plan.weeks[0];
        if (!week) return [];
        const day = week.days.find(d => d.dayIndex === dayIndex);
        return day?.sessions ?? [];
      })
    );
  }
}
