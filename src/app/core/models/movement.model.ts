export interface Movement {
  id: string;
  name: string;
  category: string;
  coachId?: string;
}

export interface PersonalRecord {
  id: string;
  athleteId: string;
  movementId: string;
  loadKg?: number;
  reps?: number;
  achievedAt: string;
  note?: string;
  movement: Movement;
}
