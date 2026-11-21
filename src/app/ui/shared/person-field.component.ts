import {ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, model, viewChild} from '@angular/core';
import {MatAutocompleteModule, MatAutocompleteSelectedEvent, MatAutocompleteTrigger} from '@angular/material/autocomplete';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MasterDataService} from '../../application/master-data.service';
import {Person} from '../../domain/model';

/** Persons offered for `text`: matching name or employee number, all when the text is empty or the selected name. */
export function filterPersons(persons: readonly Person[], text: string, selectedName: string): Person[] {
  const q = text.trim().toLocaleLowerCase('de');
  if (!q || text === selectedName) return [...persons];
  return persons.filter(p => p.name.toLocaleLowerCase('de').includes(q) || p.number.toLocaleLowerCase('de').includes(q));
}

/**
 * Person selection by typing a name or employee number. Offers active persons (plus the selected one,
 * even if inactive) without the ones in `exclude`. Clearing the text clears the selection.
 */
@Component({
  selector: 'app-person-field',
  imports: [MatAutocompleteModule, MatButtonModule, MatIconModule, MatInputModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-form-field class="full-width">
      <mat-label>{{ label() }}</mat-label>
      <input
        matInput
        [value]="text()"
        (input)="text.set(textInput.value)"
        (blur)="blurred()"
        [matAutocomplete]="auto"
        placeholder="Name oder Dienstnummer"
        #textInput
      >
      @if (personId()) {
        <button mat-icon-button matIconSuffix type="button" (click)="clear()" [attr.aria-label]="label() + ' leeren'">
          <mat-icon>close</mat-icon>
        </button>
      }
      <mat-autocomplete #auto="matAutocomplete" [displayWith]="displayName" (optionSelected)="selected($event)" (closed)="reconcile()">
        @for (p of options(); track p.number) {
          <mat-option [value]="p.number" [attr.aria-label]="p.name">{{ p.name }} <span class="number">{{ p.number }}</span></mat-option>
        } @empty {
          <mat-option disabled>Keine passende Person</mat-option>
        }
      </mat-autocomplete>
    </mat-form-field>
  `,
  styles: `
    :host { display: block; }
    .number { color: rgba(0,0,0,.5); font-size: 12px; margin-left: 6px; }
  `,
})
export class PersonFieldComponent {
  private readonly md = inject(MasterDataService);
  private readonly trigger = viewChild.required(MatAutocompleteTrigger);

  readonly label = input.required<string>();
  /** Persons not to offer (e.g. chosen in other rows); the own selection is always kept. */
  readonly exclude = input<readonly string[]>([]);
  readonly personId = model<string>('');

  protected readonly text = linkedSignal(() => this.md.personName(this.personId()));

  protected readonly options = computed(() => {
    const selected = this.personId();
    const current = this.md.person(selected);
    const excluded = new Set(this.exclude().filter(id => id !== selected));
    const base = this.md.activePersons().filter(p => !excluded.has(p.number));
    const all = current && !current.active ? [...base, current] : base;
    return filterPersons(all, this.text(), this.md.personName(selected));
  });

  protected readonly displayName = (id: string | null) => this.md.personName(id ?? '');

  protected selected(event: MatAutocompleteSelectedEvent): void {
    this.personId.set(event.option.value);
    this.text.set(this.md.personName(event.option.value));
  }

  protected clear(): void {
    this.personId.set('');
    this.text.set('');
  }

  protected blurred(): void {
    // Clicking an option blurs the input while the panel is still open; `closed` reconciles then.
    if (!this.trigger().panelOpen) this.reconcile();
  }

  /** Text without a selection: empty clears, an exact name/number match selects, anything else reverts. */
  protected reconcile(): void {
    const text = this.text().trim();
    if (!text) {
      if (this.personId()) this.personId.set('');
      return;
    }
    if (text === this.md.personName(this.personId())) return;
    const q = text.toLocaleLowerCase('de');
    const exact = this.options().filter(p => p.name.toLocaleLowerCase('de') === q || p.number.toLocaleLowerCase('de') === q);
    if (exact.length === 1) {
      this.personId.set(exact[0].number);
      this.text.set(exact[0].name);
    } else {
      this.text.set(this.md.personName(this.personId()));
    }
  }
}
