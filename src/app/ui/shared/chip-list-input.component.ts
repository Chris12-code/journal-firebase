import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {ChangeDetectionStrategy, Component, computed, input, model, signal} from '@angular/core';
import {MatAutocompleteModule, MatAutocompleteSelectedEvent} from '@angular/material/autocomplete';
import {MatChipInputEvent, MatChipsModule} from '@angular/material/chips';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';

export interface ChipOption {
  value: string;
  label: string;
}

/**
 * A list of free-text values shown as chips, with suggestions. Values are trimmed and kept
 * unique (case-insensitive); suggestions already chosen are not offered again.
 */
@Component({
  selector: 'app-chip-list-input',
  imports: [MatChipsModule, MatAutocompleteModule, MatIconModule, MatInputModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-form-field class="full-width" floatLabel="always">
      <mat-label>{{ label() }}</mat-label>
      <mat-chip-grid #grid [attr.aria-label]="label()">
        @for (v of values(); track v) {
          <mat-chip-row (removed)="remove(v)">
            {{ display(v) }}
            <button matChipRemove [attr.aria-label]="'Entfernen ' + display(v)"><mat-icon>cancel</mat-icon></button>
          </mat-chip-row>
        }
      </mat-chip-grid>
      <input
        #textInput
        [placeholder]="inputPlaceholder()"
        [matChipInputFor]="grid"
        [matAutocomplete]="auto"
        [matChipInputSeparatorKeyCodes]="separators"
        (matChipInputTokenEnd)="addTyped($event)"
        (input)="text.set(textInput.value)"
      />
      <mat-autocomplete #auto="matAutocomplete" (optionSelected)="addSelected($event, textInput)">
        @for (o of suggestions(); track o.value) {
          <mat-option [value]="o.value">{{ o.label }}</mat-option>
        }
      </mat-autocomplete>
      @if (hint()) {
        <mat-hint>{{ hint() }}</mat-hint>
      }
    </mat-form-field>
  `,
})
export class ChipListInputComponent {
  readonly label = input.required<string>();
  readonly inputPlaceholder = input('');
  readonly hint = input('');
  readonly options = input<readonly ChipOption[]>([]);
  readonly values = model<string[]>([]);

  protected readonly separators = [ENTER, COMMA];
  protected readonly text = signal('');

  /** Options not chosen yet that contain the typed text. */
  protected readonly suggestions = computed(() => {
    const chosen = new Set(this.values().map(v => v.toLocaleLowerCase('de')));
    const q = this.text().trim().toLocaleLowerCase('de');
    return this.options().filter(
      o => !chosen.has(o.value.toLocaleLowerCase('de')) && (!q || o.label.toLocaleLowerCase('de').includes(q)),
    );
  });

  protected display(value: string): string {
    return this.options().find(o => o.value === value)?.label ?? value;
  }

  private add(raw: string): void {
    const value = raw.trim();
    if (!value) return;
    const exists = this.values().some(v => v.toLocaleLowerCase('de') === value.toLocaleLowerCase('de'));
    if (!exists) this.values.set([...this.values(), value]);
  }

  protected addTyped(event: MatChipInputEvent): void {
    this.add(event.value);
    event.chipInput.clear();
    this.text.set('');
  }

  protected addSelected(event: MatAutocompleteSelectedEvent, input: HTMLInputElement): void {
    this.add(event.option.value);
    input.value = '';
    this.text.set('');
  }

  protected remove(value: string): void {
    this.values.set(this.values().filter(v => v !== value));
  }
}
