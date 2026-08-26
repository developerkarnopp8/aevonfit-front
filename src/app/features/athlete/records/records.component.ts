import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { Movement, PersonalRecord } from '../../../core/models';

interface MovementWithPR {
  movement: Movement;
  bestLoadKg?: number;
  bestReps?: number;
  lastAchievedAt?: string;
}

@Component({
  selector: 'app-records',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './records.component.html',
  styleUrl: './records.component.scss',
})
export class RecordsComponent implements OnInit {
  movements = signal<Movement[]>([]);
  records   = signal<PersonalRecord[]>([]);
  loading   = signal(true);
  expandedCategories = signal<Set<string>>(new Set());

  movementsWithPR = computed<MovementWithPR[]>(() => {
    const recordsByMovement = new Map<string, PersonalRecord[]>();
    for (const r of this.records()) {
      const list = recordsByMovement.get(r.movementId) ?? [];
      list.push(r);
      recordsByMovement.set(r.movementId, list);
    }

    return this.movements().map(movement => {
      const recs = recordsByMovement.get(movement.id) ?? [];
      const bestLoadKg = recs.length ? Math.max(...recs.map(r => r.loadKg ?? 0).filter(v => v > 0)) || undefined : undefined;
      const bestReps   = recs.length ? Math.max(...recs.map(r => r.reps ?? 0).filter(v => v > 0)) || undefined : undefined;
      const lastAchievedAt = recs.length
        ? recs.reduce((latest, r) => (r.achievedAt > latest ? r.achievedAt : latest), recs[0].achievedAt)
        : undefined;
      return { movement, bestLoadKg, bestReps, lastAchievedAt };
    });
  });

  groupedMovements = computed(() => {
    const grouped: Record<string, MovementWithPR[]> = {};
    for (const item of this.movementsWithPR()) {
      const cat = item.movement.category;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    }
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  });

  constructor(private api: ApiService) {}

  ngOnInit(): void {
    this.api.getMovements().subscribe(movements => {
      this.movements.set(movements);
      this.loading.set(false);
      const firstCategory = this.groupedMovements()[0]?.[0];
      if (firstCategory) this.expandedCategories.set(new Set([firstCategory]));
    });
    this.api.getMyPersonalRecords().subscribe(records => this.records.set(records));
  }

  toggleCategory(cat: string): void {
    this.expandedCategories.update(set => {
      const next = new Set(set);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  isCategoryExpanded(cat: string): boolean {
    return this.expandedCategories().has(cat);
  }
}
