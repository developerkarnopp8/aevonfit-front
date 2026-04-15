import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ExerciseLibraryItem } from '../../../core/models';

type DrawerMode = 'add' | 'edit';

const CATEGORIES = ['LPO', 'Força', 'Ginástica', 'Metcon', 'Resistência', 'Mobilidade', 'Core', 'Outro'];

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './library.component.html',
})
export class LibraryComponent implements OnInit {
  items       = signal<ExerciseLibraryItem[]>([]);
  loading     = signal(true);
  searchQuery = signal('');
  categories  = CATEGORIES;

  showDrawer    = signal(false);
  drawerMode    = signal<DrawerMode>('add');
  editingItem   = signal<ExerciseLibraryItem | null>(null);
  saving        = signal(false);

  form!: FormGroup;

  filteredItems = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.items().filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.category ?? '').toLowerCase().includes(q)
    );
  });

  groupedItems = computed(() => {
    const grouped: Record<string, ExerciseLibraryItem[]> = {};
    for (const item of this.filteredItems()) {
      const cat = item.category ?? 'Sem categoria';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    }
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  });

  constructor(private api: ApiService, private fb: FormBuilder) {
    this.form = this.fb.group({
      name:        ['', Validators.required],
      category:    [''],
      youtubeUrl:  [''],
      sets:        [null as number | null],
      reps:        [''],
      duration:    [''],
      restSeconds: [90],
      loadPercent: [null as number | null],
      notes:       [''],
    });
  }

  ngOnInit(): void {
    this.api.getLibrary().subscribe({
      next: items => { this.items.set(items); this.loading.set(false); },
      error: ()    => this.loading.set(false),
    });
  }

  openAdd(): void {
    this.drawerMode.set('add');
    this.editingItem.set(null);
    this.form.reset({ restSeconds: 90 });
    this.showDrawer.set(true);
  }

  openEdit(item: ExerciseLibraryItem): void {
    this.drawerMode.set('edit');
    this.editingItem.set(item);
    this.form.patchValue({
      name:        item.name,
      category:    item.category ?? '',
      youtubeUrl:  item.youtubeUrl ?? '',
      sets:        item.sets ?? null,
      reps:        item.reps ?? '',
      duration:    item.duration ?? '',
      restSeconds: item.restSeconds ?? 90,
      loadPercent: item.loadPercent ?? null,
      notes:       item.notes ?? '',
    });
    this.showDrawer.set(true);
  }

  save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    const v = this.form.value;
    const dto = {
      name:        v.name,
      category:    v.category || undefined,
      youtubeUrl:  v.youtubeUrl || undefined,
      sets:        v.sets || undefined,
      reps:        v.reps || undefined,
      duration:    v.duration || undefined,
      restSeconds: v.restSeconds,
      loadPercent: v.loadPercent || undefined,
      notes:       v.notes || undefined,
    };

    if (this.drawerMode() === 'add') {
      this.api.createLibraryItem(dto).subscribe({
        next: item => {
          this.items.update(list => [...list, item]);
          this.closeDrawer();
        },
        error: () => this.saving.set(false),
      });
    } else {
      const id = this.editingItem()!.id;
      this.api.updateLibraryItem(id, dto).subscribe({
        next: updated => {
          this.items.update(list => list.map(i => i.id === id ? updated : i));
          this.closeDrawer();
        },
        error: () => this.saving.set(false),
      });
    }
  }

  delete(item: ExerciseLibraryItem): void {
    if (!confirm(`Remover "${item.name}" da biblioteca?`)) return;
    this.api.deleteLibraryItem(item.id).subscribe({
      next: () => this.items.update(list => list.filter(i => i.id !== item.id)),
    });
  }

  closeDrawer(): void {
    this.showDrawer.set(false);
    this.saving.set(false);
    this.editingItem.set(null);
  }

  formatPreview(item: ExerciseLibraryItem): string {
    const parts: string[] = [];
    if (item.sets) parts.push(`${item.sets}×`);
    if (item.reps) parts.push(item.reps);
    if (item.duration) parts.push(item.duration);
    return parts.join(' ') || '—';
  }
}
