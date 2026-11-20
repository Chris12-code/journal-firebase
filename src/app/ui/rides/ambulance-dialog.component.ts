import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {JournalService} from '../../application/journal.service';
import {MasterDataService} from '../../application/master-data.service';
import {AMBULANCE_POSITIONS, Person, positionLabel, RESOURCE_SUGGESTIONS, Ride} from '../../domain/model';
import {newId} from '../../domain/tour';
import {normalizeVehicleNumber} from '../../domain/vehicles';
import {ChipListInputComponent, ChipOption} from '../shared/chip-list-input.component';
import {fromLocalInput, nowMinute, toLocalInput} from '../shared/datetime';
import {backendErrorMessage, joinErrors} from '../shared/errors';

export interface AmbulanceDialogData {
  /** Existing ambulance shift to edit; omitted for a new one. */
  ride?: Ride;
}

/** Marker for "free-text position" in the position select. */
const OTHER = '__OTHER__';

interface CrewRow {
  key: string;
  personId: string;
  /** A position code from AMBULANCE_POSITIONS, or OTHER. */
  position: string;
  custom: string;
}

/** Records an ambulance shift (spec rides): one ride with event, start/end, vehicles, crew with positions, assistances. */
@Component({
  selector: 'app-ambulance-dialog',
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatIconModule, MatInputModule, MatSelectModule, ChipListInputComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ isNew ? 'Ambulanz erfassen' : 'Ambulanz bearbeiten' }}</h2>
    <mat-dialog-content>
      <mat-form-field class="full-width">
        <mat-label>Veranstaltung / Ort</mat-label>
        <input matInput [(ngModel)]="event" name="event" placeholder="z. B. Seefest Strobl">
      </mat-form-field>
      <div class="dialog-row">
        <mat-form-field>
          <mat-label>Beginn</mat-label>
          <input matInput type="datetime-local" [(ngModel)]="start" name="start">
        </mat-form-field>
        <mat-form-field>
          <mat-label>Ende</mat-label>
          <input matInput type="datetime-local" [(ngModel)]="end" name="end">
        </mat-form-field>
      </div>

      <app-chip-list-input
        label="Fahrzeuge"
        inputPlaceholder="Nummer eingeben, z. B. 45.201"
        hint="Auch externe Fahrzeuge – einfach die Nummer eintippen."
        [options]="vehicleOptions()"
        [(values)]="vehicles"
      />

      <fieldset class="crew">
        <legend>Besatzung</legend>
        @for (row of crew; track row.key; let i = $index) {
          <div class="crew-row">
            <mat-form-field>
              <mat-label>Person {{ i + 1 }}</mat-label>
              <mat-select [(ngModel)]="row.personId" [name]="'person-' + row.key">
                @for (p of personOptions(row.personId); track p.number) {
                  <mat-option [value]="p.number">{{ p.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field>
              <mat-label>Position {{ i + 1 }}</mat-label>
              <mat-select [(ngModel)]="row.position" [name]="'position-' + row.key">
                @for (p of positions; track p) {
                  <mat-option [value]="p">{{ label(p) }}</mat-option>
                }
                <mat-option [value]="other">Andere …</mat-option>
              </mat-select>
            </mat-form-field>
            @if (row.position === other) {
              <mat-form-field>
                <mat-label>Andere Position {{ i + 1 }}</mat-label>
                <input matInput [(ngModel)]="row.custom" [name]="'custom-' + row.key" placeholder="z. B. Fußtrupp">
              </mat-form-field>
            }
            <button mat-icon-button type="button" (click)="removeCrew(row)" [attr.aria-label]="'Entfernen Person ' + (i + 1)">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        }
        <button mat-button type="button" (click)="addCrew()"><mat-icon>person_add</mat-icon> Person hinzufügen</button>
      </fieldset>

      <mat-form-field class="full-width">
        <mat-label>Hilfeleistungen</mat-label>
        <input matInput type="number" min="0" step="1" [(ngModel)]="assistances" name="assistances">
      </mat-form-field>

      <app-chip-list-input
        label="Weitere Kräfte vor Ort"
        inputPlaceholder="z. B. Polizei"
        [options]="resourceOptions"
        [(values)]="resources"
      />

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
    .crew { border: 1px solid rgba(0,0,0,.15); border-radius: 8px; margin: 0 0 12px; padding: 8px 12px; }
    .crew-row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .crew-row mat-form-field { flex: 1 1 150px; }
  `,
})
export class AmbulanceDialogComponent {
  private readonly data = inject<AmbulanceDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<AmbulanceDialogComponent, string>);
  private readonly journal = inject(JournalService);
  protected readonly md = inject(MasterDataService);

  protected readonly positions = AMBULANCE_POSITIONS;
  protected readonly other = OTHER;
  protected readonly label = positionLabel;
  protected readonly resourceOptions: ChipOption[] = RESOURCE_SUGGESTIONS.map(r => ({value: r, label: r}));
  protected readonly vehicleOptions = computed<ChipOption[]>(() =>
    this.md.activeVehicles().map(v => ({value: v.number, label: `${v.number} (${v.type})`})),
  );

  protected readonly isNew = !this.data.ride;
  protected event = this.data.ride?.event ?? '';
  protected start = toLocalInput(this.data.ride?.alarmAt ?? nowMinute());
  protected end = toLocalInput(this.data.ride?.returnedAt);
  protected readonly vehicles = signal<string[]>(this.data.ride?.vehicleIds ?? []);
  protected readonly resources = signal<string[]>(this.data.ride?.resources ?? []);
  protected assistances: number | null = this.data.ride?.assistances ?? 0;
  protected crew: CrewRow[] = this.data.ride
    ? this.data.ride.crew.map(c => {
        const known = AMBULANCE_POSITIONS.includes(c.role);
        return {key: newId(), personId: c.personId, position: known ? c.role : OTHER, custom: known ? '' : c.role};
      })
    : [{key: newId(), personId: '', position: 'DRIVER', custom: ''}];

  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  /** Active persons plus the selected one, even if inactive. */
  protected personOptions(selected: string): Person[] {
    const current = this.md.person(selected);
    const active = this.md.activePersons();
    return current && !current.active ? [...active, current] : active;
  }

  protected addCrew(): void {
    this.crew = [...this.crew, {key: newId(), personId: '', position: 'MEDIC', custom: ''}];
  }

  protected removeCrew(row: CrewRow): void {
    this.crew = this.crew.filter(r => r !== row);
  }

  protected async save(): Promise<void> {
    const ride: Ride = {
      id: this.data.ride?.id,
      audit: this.data.ride?.audit,
      kind: 'AMBULANCE',
      event: this.event.trim(),
      alarmAt: fromLocalInput(this.start) ?? new Date(NaN),
      returnedAt: fromLocalInput(this.end),
      vehicleIds: this.vehicles().map(normalizeVehicleNumber).filter(Boolean),
      crew: this.crew
        .filter(c => !!c.personId)
        .map(c => ({personId: c.personId, role: c.position === OTHER ? c.custom.trim() || 'Andere' : c.position})),
      assistances: this.assistances == null || (this.assistances as unknown) === '' ? 0 : Number(this.assistances),
      resources: this.resources(),
    };
    this.busy.set(true);
    this.error.set(null);
    try {
      const result = await this.journal.saveRide(ride);
      if (result.ok) this.ref.close(result.id);
      else this.error.set(joinErrors(result.errors));
    } catch (err) {
      this.error.set(backendErrorMessage(err));
    } finally {
      this.busy.set(false);
    }
  }
}
