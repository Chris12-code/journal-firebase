import {ChangeDetectionStrategy, Component, computed, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {JournalService} from '../../application/journal.service';
import {MasterDataService} from '../../application/master-data.service';
import {AMBULANCE_POSITIONS, positionLabel, RESOURCE_SUGGESTIONS, Ride} from '../../domain/model';
import {newId} from '../../domain/tour';
import {normalizeVehicleNumber} from '../../domain/vehicles';
import {ChipListInputComponent, ChipOption} from '../shared/chip-list-input.component';
import {nowMinute} from '../shared/datetime';
import {DateTimeFieldComponent} from '../shared/datetime-field.component';
import {backendErrorMessage, joinErrors} from '../shared/errors';
import {PersonFieldComponent} from '../shared/person-field.component';

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
  imports: [
    ChipListInputComponent,
    DateTimeFieldComponent,
    FormsModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    PersonFieldComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ isNew ? 'Ambulanz erfassen' : 'Ambulanz bearbeiten' }}</h2>
    <mat-dialog-content>
      <div class="dialog-form">
        <mat-form-field>
          <mat-label>Veranstaltung / Ort</mat-label>
          <input matInput [(ngModel)]="event" name="event" placeholder="z. B. Seefest Strobl">
        </mat-form-field>
        <div class="dialog-row">
          <app-datetime-field label="Beginn" [(value)]="start" />
          <app-datetime-field label="Ende" [reference]="start()" [(value)]="end" />
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
          @for (row of crew(); track row.key; let i = $index) {
            <div class="crew-row">
              <app-person-field
                class="person"
                [label]="'Person ' + (i + 1)"
                [personId]="row.personId"
                (personIdChange)="setPerson(row, $event)"
                [exclude]="chosenPersons()"
              />
              <mat-form-field class="position">
                <mat-label>Position {{ i + 1 }}</mat-label>
                <mat-select [(ngModel)]="row.position" [name]="'position-' + row.key">
                  @for (p of positions; track p) {
                    <mat-option [value]="p">{{ label(p) }}</mat-option>
                  }
                  <mat-option [value]="other">Andere …</mat-option>
                </mat-select>
              </mat-form-field>
              @if (row.position === other) {
                <mat-form-field class="position">
                  <mat-label>Andere Position {{ i + 1 }}</mat-label>
                  <input matInput [(ngModel)]="row.custom" [name]="'custom-' + row.key" placeholder="z. B. Fußtrupp">
                </mat-form-field>
              }
              <button mat-icon-button type="button" (click)="removeCrew(row)" [attr.aria-label]="'Entfernen ' + (md.personName(row.personId) || 'Person ' + (i + 1))">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          }
          <div><button mat-button type="button" (click)="addCrew()"><mat-icon>person_add</mat-icon> Person hinzufügen</button></div>
        </fieldset>

        <mat-form-field>
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
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close type="button">Abbrechen</button>
      <button mat-flat-button type="button" (click)="save()" [disabled]="busy()">Speichern</button>
    </mat-dialog-actions>
  `,
  styles: `
    .crew-row { display: flex; gap: 12px; align-items: flex-start; flex-wrap: wrap; }
    .crew-row .person { flex: 2 1 220px; }
    .crew-row .position { flex: 1 1 150px; }
    .crew-row button { margin-top: 4px; }
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
  protected readonly start = signal<Date | undefined>(this.data.ride?.alarmAt ?? nowMinute());
  protected readonly end = signal<Date | undefined>(this.data.ride?.returnedAt);
  protected readonly vehicles = signal<string[]>(this.data.ride?.vehicleIds ?? []);
  protected readonly resources = signal<string[]>(this.data.ride?.resources ?? []);
  protected assistances: number | null = this.data.ride?.assistances ?? 0;
  protected readonly crew = signal<CrewRow[]>(this.data.ride
    ? this.data.ride.crew.map(c => {
        const known = AMBULANCE_POSITIONS.includes(c.role);
        return {key: newId(), personId: c.personId, position: known ? c.role : OTHER, custom: known ? '' : c.role};
      })
    : [{key: newId(), personId: '', position: 'DRIVER', custom: ''}]);
  protected readonly chosenPersons = computed(() => this.crew().map(r => r.personId).filter(Boolean));

  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected setPerson(row: CrewRow, personId: string): void {
    this.crew.update(rows => rows.map(r => (r === row ? {...r, personId} : r)));
  }

  protected addCrew(): void {
    this.crew.update(rows => [...rows, {key: newId(), personId: '', position: 'MEDIC', custom: ''}]);
  }

  protected removeCrew(row: CrewRow): void {
    this.crew.update(rows => rows.filter(r => r !== row));
  }

  protected async save(): Promise<void> {
    const ride: Ride = {
      id: this.data.ride?.id,
      audit: this.data.ride?.audit,
      kind: 'AMBULANCE',
      event: this.event.trim(),
      alarmAt: this.start() ?? new Date(NaN),
      returnedAt: this.end(),
      vehicleIds: this.vehicles().map(normalizeVehicleNumber).filter(Boolean),
      crew: this.crew()
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
