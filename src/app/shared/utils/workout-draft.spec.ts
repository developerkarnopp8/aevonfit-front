import { loadDraft, saveDraft, clearDraft, WorkoutDraft } from './workout-draft';

describe('workout-draft', () => {
  beforeEach(() => localStorage.clear());

  const draft: WorkoutDraft = {
    sessionId: 's-1',
    startedAt: '2026-08-28T10:00:00.000Z',
    currentIndex: 2,
    perExercise: { 'ex-1': 60, 'ex-2': 90 },
    updatedAt: '2026-08-28T10:05:00.000Z',
  };

  it('salva e carrega o rascunho da mesma sessão', () => {
    saveDraft(draft);
    expect(loadDraft('s-1')).toEqual(draft);
  });

  it('retorna null quando não há rascunho', () => {
    expect(loadDraft('inexistente')).toBeNull();
  });

  it('retorna null quando o rascunho é de outra sessão', () => {
    saveDraft(draft);
    expect(loadDraft('s-2')).toBeNull();
  });

  it('clearDraft remove o rascunho', () => {
    saveDraft(draft);
    clearDraft('s-1');
    expect(loadDraft('s-1')).toBeNull();
  });

  it('loadDraft retorna null quando o JSON está corrompido', () => {
    localStorage.setItem('workout-draft:s-1', '{quebrado');
    expect(loadDraft('s-1')).toBeNull();
  });

  it('não lança quando localStorage não está disponível', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(() => saveDraft(draft)).not.toThrow();
    spy.mockRestore();
  });
});
