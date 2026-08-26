/**
 * Utilitários de data "date-only" em UTC — evita bug de dia errado perto da
 * meia-noite causado por diferença de fuso entre o servidor (que grava
 * startDate normalizado em UTC) e o navegador do usuário. Nunca usar
 * `new Date(y, m-1, d)` (fuso local) nem getters locais (.getDate(),
 * .getMonth()) sobre uma data vinda do backend — só os métodos abaixo ou
 * os equivalentes `getUTC*`/`setUTC*` nativos.
 */

/** Constrói uma Date em UTC a partir de ano/mês(1-based)/dia. */
export function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

/** Soma (ou subtrai, com número negativo) dias a uma data UTC. */
export function addUtcDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/** Formata uma Date como "YYYY-MM-DD", lendo os componentes em UTC. */
export function toDateKey(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Extrai a chave "YYYY-MM-DD" de uma string ISO vinda do backend (ex: "2026-03-09T00:00:00.000Z" -> "2026-03-09"). */
export function dateKeyFromIso(iso: string): string {
  return iso.slice(0, 10);
}

/** Constrói uma Date UTC a partir da chave "YYYY-MM-DD" de uma string ISO do backend. */
export function utcDateFromIso(iso: string): Date {
  const [y, m, d] = dateKeyFromIso(iso).split('-').map(Number);
  return utcDate(y, m, d);
}

/**
 * Chave "YYYY-MM-DD" do dia LOCAL (fuso do navegador) de uma Date qualquer.
 * Usar pra timestamps REAIS (ex: WorkoutLog.completedAt — o momento em que
 * o atleta de fato registrou o treino) — diferente de `toDateKey`, que é
 * pra datas SINTÉTICAS derivadas de `startDate` (sempre UTC). Comparar uma
 * chave `toDateKey` com uma `toLocalDateKey` funciona: as duas produzem
 * "YYYY-MM-DD" representando o dia de calendário pretendido de cada lado,
 * só o método de extração muda conforme a natureza do dado.
 */
export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Chave "YYYY-MM-DD" do dia local ATUAL do usuário — atalho pra `toLocalDateKey(new Date())`. */
export function todayLocalKey(): string {
  return toLocalDateKey(new Date());
}
