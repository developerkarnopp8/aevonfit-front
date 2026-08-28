export interface WorkoutDraft {
  sessionId: string;
  /** ISO — momento do primeiro "Iniciar exercício" do treino */
  startedAt: string;
  currentIndex: number;
  /** exerciseId -> tempo de execução em segundos (exercícios já concluídos) */
  perExercise: Record<string, number>;
  updatedAt: string;
}

const key = (sessionId: string) => `workout-draft:${sessionId}`;

export function loadDraft(sessionId: string): WorkoutDraft | null {
  try {
    const raw = localStorage.getItem(key(sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WorkoutDraft;
    if (!parsed || parsed.sessionId !== sessionId) return null;
    const MAX_DRAFT_AGE_MS = 6 * 60 * 60 * 1000; // 6h
    if (!parsed.updatedAt || Date.now() - new Date(parsed.updatedAt).getTime() > MAX_DRAFT_AGE_MS) {
      clearDraft(sessionId);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveDraft(draft: WorkoutDraft): void {
  try {
    localStorage.setItem(key(draft.sessionId), JSON.stringify(draft));
  } catch {
    /* localStorage indisponível (aba anônima, storage bloqueado) — segue sem rascunho */
  }
}

export function clearDraft(sessionId: string): void {
  try {
    localStorage.removeItem(key(sessionId));
  } catch {
    /* idem */
  }
}
