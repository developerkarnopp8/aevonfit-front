import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TrainingPlan, Week } from '../../core/models';
import { WorkoutLogEntry } from '../../core/services/api.service';
import { utcDateFromIso, addUtcDays, toDateKey, toLocalDateKey } from './date-key';

function formatDateBr(date: Date): string {
  const d = String(date.getUTCDate()).padStart(2, '0');
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${d}/${m}`;
}

function dateOfDay(planStartIso: string, weekNumber: number, dayIndex: number): Date {
  const monday1 = utcDateFromIso(planStartIso);
  return addUtcDays(monday1, (weekNumber - 1) * 7 + (dayIndex - 1));
}

/**
 * Monta as linhas da tabela pra uma semana: uma linha por exercício, com uma
 * linha extra "✓ feito..." logo abaixo quando há log do atleta casando por
 * exerciseId e caindo na data daquele dia.
 */
function buildWeekRows(plan: TrainingPlan, week: Week, logs: WorkoutLogEntry[]): (string | number)[][] {
  const rows: (string | number)[][] = [];
  for (const day of week.days) {
    const dayDate = dateOfDay(plan.startDate, week.weekNumber, day.dayIndex);
    const dayKey = toDateKey(dayDate);
    for (const session of day.sessions) {
      for (const exercise of session.exercises) {
        rows.push([
          `${day.dayOfWeek} (${formatDateBr(dayDate)})`,
          session.name,
          exercise.name,
          exercise.sets != null ? String(exercise.sets) : '-',
          exercise.reps ?? '-',
          exercise.loadPercent != null ? `${exercise.loadPercent}%` : '-',
          exercise.coachNotes ?? '',
        ]);
        // toLocalDateKey no log (timestamp real, dia local do atleta) vs.
        // dayKey em toDateKey (dia sintético UTC derivado de startDate) —
        // as duas produzem "YYYY-MM-DD" do dia de calendário pretendido,
        // só o método de extração muda conforme a natureza do dado.
        const log = logs.find(l => l.exerciseId === exercise.id && toLocalDateKey(l.completedAt) === dayKey);
        if (log) {
          rows.push(['', '', `✓ feito — ${log.setsCompleted} sets${log.notes ? ', ' + log.notes : ''}`, '', '', '', '']);
        }
      }
    }
  }
  return rows;
}

const COLUMNS = ['Dia', 'Sessão', 'Exercício', 'Sets', 'Reps', 'Carga', 'Notas'];

function baseDoc(studentName: string, planTitle: string, subtitle: string): jsPDF {
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(studentName, 14, 18);
  doc.setFontSize(11);
  doc.text(`${planTitle} — ${subtitle}`, 14, 26);
  return doc;
}

export function exportWeekToPdf(plan: TrainingPlan, weekNumber: number, studentName: string, logs: WorkoutLogEntry[]): void {
  const week = plan.weeks.find(w => w.weekNumber === weekNumber);
  if (!week) return;
  const doc = baseDoc(studentName, plan.title, `Semana ${weekNumber}`);
  autoTable(doc, { startY: 32, head: [COLUMNS], body: buildWeekRows(plan, week, logs) });
  doc.save(`${plan.title} - Semana ${weekNumber}.pdf`);
}

export function exportMonthToPdf(plan: TrainingPlan, studentName: string, logs: WorkoutLogEntry[]): void {
  const doc = baseDoc(studentName, plan.title, 'Mês completo');
  let startY = 32;
  for (const week of plan.weeks) {
    autoTable(doc, {
      startY,
      head: [[`Semana ${week.weekNumber}`, '', '', '', '', '', '']],
      body: buildWeekRows(plan, week, logs),
      headStyles: { fillColor: [40, 40, 40] },
    });
    startY = (doc as any).lastAutoTable.finalY + 8;
  }
  doc.save(`${plan.title} - Completo.pdf`);
}
