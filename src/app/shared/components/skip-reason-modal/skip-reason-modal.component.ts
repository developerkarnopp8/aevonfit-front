import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SkipReason, SkipDecision } from '../../../core/models';

const REASONS: { value: SkipReason; label: string }[] = [
  { value: 'NoTime', label: 'Sem tempo' },
  { value: 'Injury', label: 'Lesão / dor' },
  { value: 'Later',  label: 'Vou fazer depois' },
  { value: 'Other',  label: 'Outro' },
];

@Component({
  selector: 'app-skip-reason-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './skip-reason-modal.component.html',
})
export class SkipReasonModalComponent {
  @Input() open = false;
  @Output() confirmed = new EventEmitter<{ reason: SkipReason; decision: SkipDecision; note?: string }>();
  @Output() cancelled = new EventEmitter<void>();

  reasons = REASONS;
  selectedReason = signal<SkipReason | null>(null);
  selectedDecision = signal<SkipDecision | null>(null);
  note = signal('');

  get noteRequired(): boolean {
    return this.selectedReason() === 'Other';
  }

  get canConfirm(): boolean {
    return !!this.selectedReason() && !!this.selectedDecision() && (!this.noteRequired || this.note().trim().length > 0);
  }

  selectReason(r: SkipReason): void { this.selectedReason.set(r); }
  selectDecision(d: SkipDecision): void { this.selectedDecision.set(d); }

  confirm(): void {
    if (!this.canConfirm) return;
    this.confirmed.emit({
      reason: this.selectedReason()!,
      decision: this.selectedDecision()!,
      note: this.note().trim() || undefined,
    });
    this.reset();
  }

  cancel(): void {
    this.cancelled.emit();
    this.reset();
  }

  private reset(): void {
    this.selectedReason.set(null);
    this.selectedDecision.set(null);
    this.note.set('');
  }
}
