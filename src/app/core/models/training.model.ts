export type SessionType =
  | 'LPO'
  | 'Strength'
  | 'Gymnastics'
  | 'Metcon'
  | 'Endurance'
  | 'Mobility'
  | 'Core';

export interface Exercise {
  id: string;
  name: string;
  youtubeUrl?: string;
  sets?: number | null;
  reps?: number | string | null;
  duration?: string | null;
  restSeconds?: number;
  loadPercent?: number | null;
  coachNotes?: string;
  completed: boolean;
}

export interface Session {
  id: string;
  name: string;
  type: SessionType;
  order: number;
  exercises: Exercise[];
}

export interface TrainingDay {
  id: string;
  dayOfWeek: string;
  dayIndex: number;
  sessions: Session[];
}

export interface Week {
  id: string;
  weekNumber: number;
  days: TrainingDay[];
}

export interface TrainingPlan {
  id: string;
  studentId: string;
  coachId: string;
  month: number;
  title: string;
  published: boolean;
  weeks: Week[];
}

export interface WorkoutLog {
  id: string;
  studentId: string;
  sessionId: string;
  completedAt: string;
  exerciseLogs: ExerciseLog[];
}

export interface ExerciseLog {
  exerciseId: string;
  completedSets: number;
  notes?: string;
}
