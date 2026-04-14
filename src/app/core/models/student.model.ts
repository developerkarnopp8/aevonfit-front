export interface Student {
  id: string;
  name: string;
  email: string;
  goal: string;
  currentMonth: number;
  currentWeek: number;
  avatarUrl?: string;
  coachId: string;
  completionPercent?: number;
}
