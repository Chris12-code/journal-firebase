import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatButtonModule} from '@angular/material/button';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {JournalService} from '../../application/journal.service';
import {MasterDataService} from '../../application/master-data.service';
import {Role, ROLE_LABELS, ROLES, Shift, SHIFT_LABELS, SHIFTS, Tour, TourKind} from '../../domain/model';
import {PlannedSlot} from '../../domain/shift-plan';
import {newId} from '../../domain/tour';
import {normalizeVehicleNumber} from '../../domain/vehicles';
import {formatTime, nowMinute} from '../shared/datetime';
import {DateTimeFieldComponent} from '../shared/datetime-field.component';
import {backendErrorMessage, joinErrors} from '../shared/errors';
import {PersonFieldComponent} from '../shared/person-field.component';
import {describeWarnings, sortedMembers} from './tour-text';

export interface TourDialogData {
  /** Existing tour to correct; omitted to start a new tour. */
  tour?: Tour;
  /** Kind of a new tour (default SHIFT). */
  kind?: TourKind;
  /** Planned slot a new shift tour occupies; pre-fills shift, vehicle and start. */
  slot?: PlannedSlot;
}

interface MemberRow {
  id: string;
  personId: string;
  role: Role;
  from: Date | undefined;
  to: Date | undefined;
}

/**
 * Starts a new tour (shared start time, one person per role) or corrects an existing one
 * (every crew entry with its own role, person and times).
 */
@Component({
  selector: 'app-tour-dialog',
  imports: [
    DateTimeFieldComponent,
    FormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    PersonFieldComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ title }}</h2>
    <mat-dialog-content>
      <div class="dialog-form">
        @if (data.slot; as slot) {
          <p class="slot-info muted">Geplant: {{ slot.vehicleType }} {{ slot.vehicleId }} · {{ shiftLabels[slot.shift] }} · {{ planned(slot) }}</p>
        }
        <div class="dialog-row">
          <mat-form-field>
            <mat-label>Schicht</mat-label>
            <mat-select [(ngModel)]="shift" name="shift">
              @for (s of shifts; track s) {
                <mat-option [value]="s">{{ shiftLabels[s] }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field floatLabel="always">
            <mat-label>Stammfahrzeug</mat-label>
            <input matInput [ngModel]="homeVehicle()" (ngModelChange)="homeVehicle.set($event)" name="vehicle" [matAutocomplete]="vehicleAuto" placeholder="leer = ohne Fahrzeug">
            <mat-autocomplete #vehicleAuto="matAutocomplete">
              @for (v of vehicleSuggestions(); track v.number) {
                <mat-option [value]="v.number">{{ v.number }} ({{ v.type }})</mat-option>
              }
            </mat-autocomplete>
            <mat-hint>{{ vehicleHint() }}</mat-hint>
          </mat-form-field>
        </div>

        @if (isNew) {
          <app-datetime-field label="Beginn" [value]="start()" (valueChange)="startChanged($event)" />
          @for (row of rows(); track row.id) {
            <app-person-field
              [label]="roleLabels[row.role]"
              [personId]="row.personId"
              (personIdChange)="setPerson(row, $event)"
              [exclude]="chosenPersons()"
            />
          }
        } @else {
          @for (row of rows(); track row.id; let i = $index) {
            <fieldset class="member">
              <legend>Eintrag {{ i + 1 }}</legend>
              <div class="dialog-row">
                <mat-form-field>
                  <mat-label>Rolle</mat-label>
                  <mat-select [(ngModel)]="row.role" [name]="'role-' + row.id">
                    @for (r of roles; track r) {
                      <mat-option [value]="r">{{ roleLabels[r] }}</mat-option>
                    }
                  </mat-select>
                </mat-form-field>
                <app-person-field label="Person" [personId]="row.personId" (personIdChange)="setPerson(row, $event)" />
              </div>
              <div class="dialog-row">
                <app-datetime-field label="Von" [(value)]="row.from" />
                <app-datetime-field label="Bis" [reference]="row.from" [(value)]="row.to" />
              </div>
              <div><button mat-button type="button" (click)="removeRow(row)"><mat-icon>delete</mat-icon> Eintrag entfernen</button></div>
            </fieldset>
          }
          <div><button mat-button type="button" (click)="addRow()"><mat-icon>person_add</mat-icon> Eintrag hinzufügen</button></div>
        }

        @for (w of warnings(); track w) {
          <p class="warning-text"><span class="material-icons inline">warning</span> {{ w }}</p>
        }
        @if (error()) {
          <p class="error-text">{{ error() }}</p>
        }
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">Abbrechen</button>
      <button mat-flat-button type="button" (click)="save()" [disabled]="busy()">Speichern</button>
    </mat-dialog-actions>
  `,
  styles: `
    .inline { font-size: 18px; vertical-align: text-bottom; }
  `,
})
export class TourDialogComponent {
  protected readonly data = inject<TourDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<TourDialogComponent, string>);
  private readonly journal = inject(JournalService);
  protected readonly md = inject(MasterDataService);

  protected readonly shifts = SHIFTS;
  protected readonly shiftLabels = SHIFT_LABELS;
  protected readonly roles = ROLES;
  protected readonly roleLabels = ROLE_LABELS;

  protected readonly isNew = !this.data.tour;
  private readonly kind: TourKind = this.data.tour?.kind ?? this.data.kind ?? 'SHIFT';
  private readonly slotKey: string | undefined = this.data.tour ? this.data.tour.slotKey : this.data.slot?.key;
  protected readonly title = !this.isNew
    ? 'Tour korrigieren'
    : this.kind === 'EXTRA' ? 'Zusatzfahrzeug' : this.data.slot ? 'Dienst besetzen' : 'Tour beginnen';
  protected shift: Shift;
  /** Free-text vehicle number; a signal so the suggestions stay stable between change detection runs. */
  protected readonly homeVehicle = signal('');
  protected readonly vehicleSuggestions = computed(() => this.md.suggestVehicles(this.homeVehicle()));
  protected readonly start = signal<Date | undefined>(undefined);
  protected readonly rows = signal<MemberRow[]>([]);
  protected readonly chosenPersons = computed(() => this.rows().map(r => r.personId).filter(Boolean));

  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  constructor() {
    const tour = this.data.tour;
    if (tour) {
      this.shift = tour.shift;
      this.homeVehicle.set(tour.homeVehicleId ?? '');
      this.rows.set(sortedMembers(tour).map(m => ({id: m.id, personId: m.personId, role: m.role, from: m.from, to: m.to})));
    } else if (this.data.slot) {
      const slot = this.data.slot;
      this.shift = slot.shift;
      this.homeVehicle.set(slot.vehicleId);
      this.start.set(slot.start);
      this.rows.set(ROLES.map(role => ({id: newId(), personId: '', role, from: slot.start, to: undefined})));
    } else {
      const now = nowMinute();
      this.shift = now.getHours() >= 6 && now.getHours() < 18 ? 'DAY' : 'NIGHT';
      this.start.set(now);
      this.rows.set(ROLES.map(role => ({id: newId(), personId: '', role, from: now, to: undefined})));
    }
  }

  protected vehicleHint(): string {
    const number = normalizeVehicleNumber(this.homeVehicle());
    if (!number) return 'Ohne Fahrzeug – kann später bei jeder Fahrt gewählt werden.';
    return this.md.vehicle(number) ? '' : 'Unbekannte Nummer – wird so übernommen.';
  }

  protected startChanged(value: Date | undefined): void {
    this.start.set(value);
    this.rows.update(rows => rows.map(r => ({...r, from: value})));
  }

  protected setPerson(row: MemberRow, personId: string): void {
    this.rows.update(rows => rows.map(r => (r === row ? {...r, personId} : r)));
  }

  protected addRow(): void {
    this.rows.update(rows => [...rows, {id: newId(), personId: '', role: 'THIRD', from: nowMinute(), to: undefined}]);
  }

  protected removeRow(row: MemberRow): void {
    this.rows.update(rows => rows.filter(r => r !== row));
  }

  protected planned(slot: PlannedSlot): string {
    return `${formatTime(slot.start, slot.start)}–${formatTime(slot.end, slot.start)}`;
  }

  private draft(): Tour {
    const rows = this.isNew ? this.rows().filter(r => !!r.personId) : this.rows();
    const {slotKey: _ignored, ...base} = this.data.tour ?? {};
    return {
      ...base,
      kind: this.kind,
      ...(this.slotKey ? {slotKey: this.slotKey} : {}),
      shift: this.shift,
      homeVehicleId: normalizeVehicleNumber(this.homeVehicle()) || undefined,
      members: rows.map(r => {
        const member = {id: r.id, personId: r.personId, role: r.role, from: r.from ?? new Date(NaN)};
        return r.to ? {...member, to: r.to} : member;
      }),
    };
  }

  protected warnings(): string[] {
    const draft = this.draft();
    return describeWarnings(this.journal.warningsFor(draft), this.journal.tours(), this.md);
  }

  protected async save(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const result = await this.journal.saveTour(this.draft());
      if (result.ok) {
        this.ref.close(result.id);
      } else {
        this.error.set(joinErrors(result.errors));
      }
    } catch (err) {
      this.error.set(backendErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }
}
