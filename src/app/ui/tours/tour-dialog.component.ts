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
import {Person, Role, ROLE_LABELS, ROLES, Shift, SHIFT_LABELS, SHIFTS, Tour} from '../../domain/model';
import {newId} from '../../domain/tour';
import {normalizeVehicleNumber} from '../../domain/vehicles';
import {fromLocalInput, nowMinute, toLocalInput} from '../shared/datetime';
import {backendErrorMessage, joinErrors} from '../shared/errors';
import {describeWarnings, sortedMembers} from './tour-text';

export interface TourDialogData {
  /** Existing tour to correct; omitted to start a new tour. */
  tour?: Tour;
}

interface MemberRow {
  id: string;
  personId: string;
  role: Role;
  from: string;
  to: string;
}

/**
 * Starts a new tour (shared start time, one person per role) or corrects an existing one
 * (every crew entry with its own role, person and times).
 */
@Component({
  selector: 'app-tour-dialog',
  imports: [FormsModule, MatAutocompleteModule, MatDialogModule, MatButtonModule, MatIconModule, MatInputModule, MatSelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ isNew ? 'Tour beginnen' : 'Tour korrigieren' }}</h2>
    <mat-dialog-content>
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
        <mat-form-field class="full-width">
          <mat-label>Beginn</mat-label>
          <input matInput type="datetime-local" [(ngModel)]="start" name="start" (ngModelChange)="startChanged($event)">
        </mat-form-field>
        @for (row of rows; track row.id) {
          <mat-form-field class="full-width">
            <mat-label>{{ roleLabels[row.role] }}</mat-label>
            <mat-select [(ngModel)]="row.personId" [name]="'person-' + row.id">
              <mat-option value="">– niemand –</mat-option>
              @for (p of personOptions(row.personId); track p.number) {
                <mat-option [value]="p.number">{{ p.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }
      } @else {
        @for (row of rows; track row.id; let i = $index) {
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
              <mat-form-field>
                <mat-label>Person</mat-label>
                <mat-select [(ngModel)]="row.personId" [name]="'person-' + row.id">
                  @for (p of personOptions(row.personId); track p.number) {
                    <mat-option [value]="p.number">{{ p.name }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>
            <div class="dialog-row">
              <mat-form-field>
                <mat-label>Von</mat-label>
                <input matInput type="datetime-local" [(ngModel)]="row.from" [name]="'from-' + row.id">
              </mat-form-field>
              <mat-form-field>
                <mat-label>Bis</mat-label>
                <input matInput type="datetime-local" [(ngModel)]="row.to" [name]="'to-' + row.id">
              </mat-form-field>
            </div>
            <button mat-button type="button" (click)="removeRow(row)"><mat-icon>delete</mat-icon> Eintrag entfernen</button>
          </fieldset>
        }
        <button mat-button type="button" (click)="addRow()"><mat-icon>person_add</mat-icon> Eintrag hinzufügen</button>
      }

      @for (w of warnings(); track w) {
        <p class="warning-text"><span class="material-icons inline">warning</span> {{ w }}</p>
      }
      @if (error()) {
        <p class="error-text">{{ error() }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">Abbrechen</button>
      <button mat-flat-button type="button" (click)="save()" [disabled]="busy()">Speichern</button>
    </mat-dialog-actions>
  `,
  styles: `
    .member { border: 1px solid rgba(0,0,0,.15); border-radius: 8px; margin: 0 0 12px; padding: 8px 12px; }
    .inline { font-size: 18px; vertical-align: text-bottom; }
  `,
})
export class TourDialogComponent {
  private readonly data = inject<TourDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<TourDialogComponent, string>);
  private readonly journal = inject(JournalService);
  protected readonly md = inject(MasterDataService);

  protected readonly shifts = SHIFTS;
  protected readonly shiftLabels = SHIFT_LABELS;
  protected readonly roles = ROLES;
  protected readonly roleLabels = ROLE_LABELS;

  protected readonly isNew = !this.data.tour;
  protected shift: Shift;
  /** Free-text vehicle number; a signal so the suggestions stay stable between change detection runs. */
  protected readonly homeVehicle = signal('');
  protected readonly vehicleSuggestions = computed(() => this.md.suggestVehicles(this.homeVehicle()));
  protected start = '';
  protected rows: MemberRow[];

  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  constructor() {
    const tour = this.data.tour;
    if (tour) {
      this.shift = tour.shift;
      this.homeVehicle.set(tour.homeVehicleId ?? '');
      this.rows = sortedMembers(tour).map(m => ({
        id: m.id, personId: m.personId, role: m.role, from: toLocalInput(m.from), to: toLocalInput(m.to),
      }));
    } else {
      const now = nowMinute();
      this.shift = now.getHours() >= 6 && now.getHours() < 18 ? 'DAY' : 'NIGHT';
      this.start = toLocalInput(now);
      this.rows = ROLES.map(role => ({id: newId(), personId: '', role, from: this.start, to: ''}));
    }
  }

  protected vehicleHint(): string {
    const number = normalizeVehicleNumber(this.homeVehicle());
    if (!number) return 'Ohne Fahrzeug – kann später bei jeder Fahrt gewählt werden.';
    return this.md.vehicle(number) ? '' : 'Unbekannte Nummer – wird so übernommen.';
  }

  /** Active persons plus the currently selected one, even if inactive. */
  protected personOptions(selected: string): Person[] {
    const current = this.md.person(selected);
    const active = this.md.activePersons();
    return current && !current.active ? [...active, current] : active;
  }

  protected startChanged(value: string): void {
    for (const row of this.rows) row.from = value;
  }

  protected addRow(): void {
    this.rows = [...this.rows, {id: newId(), personId: '', role: 'THIRD', from: toLocalInput(nowMinute()), to: ''}];
  }

  protected removeRow(row: MemberRow): void {
    this.rows = this.rows.filter(r => r !== row);
  }

  private draft(): Tour {
    const rows = this.isNew ? this.rows.filter(r => !!r.personId) : this.rows;
    return {
      ...this.data.tour,
      shift: this.shift,
      homeVehicleId: normalizeVehicleNumber(this.homeVehicle()) || undefined,
      members: rows.map(r => {
        const to = fromLocalInput(r.to);
        const member = {id: r.id, personId: r.personId, role: r.role, from: fromLocalInput(r.from) ?? new Date(NaN)};
        return to ? {...member, to} : member;
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
