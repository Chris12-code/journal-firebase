import {ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, effect, inject, OnInit, signal, untracked} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatAutocompleteModule} from '@angular/material/autocomplete';
import {MatButtonModule} from '@angular/material/button';
import {MAT_DIALOG_DATA, MatDialogModule, MatDialogRef} from '@angular/material/dialog';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {MatSelectModule} from '@angular/material/select';
import {JournalService} from '../../application/journal.service';
import {MasterDataService} from '../../application/master-data.service';
import {
  PATIENT_TYPES,
  PatientType,
  Person,
  Ride,
  RIDE_CATEGORIES,
  RIDE_TYPES,
  RideCategory,
  RideType,
  RESOURCE_SUGGESTIONS,
  CrewPosition,
  Role,
  ROLE_LABELS,
  ROLES,
  Tour,
} from '../../domain/model';
import {newId} from '../../domain/tour';
import {normalizeVehicleNumber} from '../../domain/vehicles';
import {ChipListInputComponent, ChipOption} from '../shared/chip-list-input.component';
import {fromLocalInput, nowMinute, toLocalInput} from '../shared/datetime';
import {backendErrorMessage, joinErrors} from '../shared/errors';
import {tourOptionLabel} from '../tours/tour-text';

export interface RideDialogData {
  /** Existing ride to edit; omitted for a new ride. */
  ride?: Ride;
}

interface CrewRow {
  key: string;
  personId: string;
  role: CrewPosition;
}

/** Logs or edits a ride (spec rides): tour, vehicle actually used, crew snapshot and classification. */
@Component({
  selector: 'app-ride-dialog',
  imports: [ChipListInputComponent, FormsModule, MatAutocompleteModule, MatDialogModule, MatButtonModule, MatIconModule, MatInputModule, MatSelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h2 mat-dialog-title>{{ isNew ? 'Neue Fahrt' : 'Fahrt bearbeiten' }}</h2>
    <mat-dialog-content>
      <div class="dialog-row">
        <mat-form-field>
          <mat-label>Alarmierung</mat-label>
          <input matInput type="datetime-local" [(ngModel)]="alarmAt" name="alarmAt" (change)="alarmChanged()">
        </mat-form-field>
        <mat-form-field>
          <mat-label>Rückkehr</mat-label>
          <input matInput type="datetime-local" [(ngModel)]="returnedAt" name="returnedAt">
        </mat-form-field>
      </div>

      <mat-form-field class="full-width">
        <mat-label>Tour</mat-label>
        <mat-select [(ngModel)]="tourId" name="tour" (selectionChange)="tourChanged()">
          @for (t of tourOptions(); track t.id) {
            <mat-option [value]="t.id">{{ tourLabel(t) }}</mat-option>
          } @empty {
            <mat-option disabled>Keine aktive Tour zu dieser Zeit</mat-option>
          }
        </mat-select>
      </mat-form-field>

      <mat-form-field class="full-width" floatLabel="always">
        <mat-label>Fahrzeug</mat-label>
        <input matInput [ngModel]="vehicle()" (ngModelChange)="vehicle.set($event)" name="vehicle" [matAutocomplete]="vehicleAuto" placeholder="z. B. 44.201">
        <mat-autocomplete #vehicleAuto="matAutocomplete">
          @for (v of vehicleSuggestions(); track v.number) {
            <mat-option [value]="v.number">{{ v.number }} ({{ v.type }})</mat-option>
          }
        </mat-autocomplete>
        <mat-hint>{{ vehicleHint() }}</mat-hint>
      </mat-form-field>

      <fieldset class="crew">
        <legend>Besatzung</legend>
        @for (row of crew; track row.key; let i = $index) {
          <div class="crew-row">
            <mat-form-field>
              <mat-label>Rolle {{ i + 1 }}</mat-label>
              <mat-select [(ngModel)]="row.role" [name]="'role-' + row.key" (selectionChange)="crewTouched = true">
                @for (r of roles; track r) {
                  <mat-option [value]="r">{{ roleLabels[r] }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field>
              <mat-label>Person {{ i + 1 }}</mat-label>
              <mat-select [(ngModel)]="row.personId" [name]="'person-' + row.key" (selectionChange)="crewTouched = true">
                @for (p of personOptions(row.personId); track p.number) {
                  <mat-option [value]="p.number">{{ p.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <button mat-icon-button type="button" (click)="removeCrew(row)" [attr.aria-label]="'Entfernen ' + md.personName(row.personId)">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        }
        <button mat-button type="button" (click)="addCrew()"><mat-icon>person_add</mat-icon> Person hinzufügen</button>
      </fieldset>

      <div class="dialog-row">
        <mat-form-field>
          <mat-label>Art</mat-label>
          <mat-select [(ngModel)]="type" name="type">
            @for (t of rideTypes; track t) {
              <mat-option [value]="t">{{ t }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Kategorie</mat-label>
          <mat-select [(ngModel)]="category" name="category">
            <mat-option [value]="undefined">–</mat-option>
            @for (c of categories; track c) {
              <mat-option [value]="c">{{ c }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Patient</mat-label>
          <mat-select [(ngModel)]="patient" name="patient">
            <mat-option [value]="undefined">–</mat-option>
            @for (p of patients; track p) {
              <mat-option [value]="p">{{ p }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>
      <div class="dialog-row">
        <mat-form-field>
          <mat-label>Einsatzort</mat-label>
          <input matInput [(ngModel)]="pickup" name="pickup">
        </mat-form-field>
        <mat-form-field>
          <mat-label>Zielort</mat-label>
          <input matInput [(ngModel)]="destination" name="destination">
        </mat-form-field>
      </div>

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
    .crew-row mat-form-field { flex: 1 1 160px; }
  `,
})
export class RideDialogComponent implements OnInit {
  private readonly data = inject<RideDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<RideDialogComponent, string>);
  private readonly journal = inject(JournalService);
  protected readonly md = inject(MasterDataService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly roles = ROLES;
  protected readonly roleLabels = ROLE_LABELS;
  protected readonly rideTypes = RIDE_TYPES;
  protected readonly categories = RIDE_CATEGORIES;
  protected readonly patients = PATIENT_TYPES;

  protected readonly isNew = !this.data.ride;
  protected readonly resourceOptions: ChipOption[] = RESOURCE_SUGGESTIONS.map(r => ({value: r, label: r}));
  protected readonly resources = signal<string[]>(this.data.ride?.resources ?? []);
  protected alarmAt = toLocalInput(this.data.ride?.alarmAt ?? nowMinute());
  protected returnedAt = toLocalInput(this.data.ride?.returnedAt);
  protected tourId = this.data.ride?.tourId ?? '';
  /** Free-text vehicle number; a signal so the suggestions stay stable between change detection runs. */
  protected readonly vehicle = signal(this.data.ride?.vehicleIds[0] ?? '');
  protected readonly vehicleSuggestions = computed(() => this.md.suggestVehicles(this.vehicle()));
  protected crew: CrewRow[] = (this.data.ride?.crew ?? []).map(c => ({key: newId(), ...c}));
  protected crewTouched = !this.isNew;
  protected type: RideType | undefined = this.data.ride?.type;
  protected category: RideCategory | undefined = this.data.ride?.category;
  protected patient: PatientType | undefined = this.data.ride?.patient;
  protected pickup = this.data.ride?.pickup ?? '';
  protected destination = this.data.ride?.destination ?? '';

  /** Tours loaded on demand for an alarm time before the display window. */
  private readonly olderTours = signal<Tour[]>([]);
  /** Alarm time as a signal so that the tour options follow it. */
  private readonly alarm = signal<Date | undefined>(fromLocalInput(this.alarmAt));

  /** Tours active at the alarm time (live while within the display window), plus the ride's own tour when editing. */
  protected readonly tourOptions = computed(() => {
    const at = this.alarm();
    const tours = at ? (this.journal.activeToursAt(at) ?? this.olderTours()) : [];
    const own = this.data.ride ? this.journal.tourById(this.data.ride.tourId) : undefined;
    return own && !tours.some(t => t.id === own.id) ? [...tours, own] : tours;
  });

  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  constructor() {
    // A new ride picks the tour automatically as soon as exactly one is active (tours may still be loading).
    effect(() => {
      const options = this.tourOptions();
      if (this.isNew && !this.tourId && options.length === 1) {
        untracked(() => {
          this.tourId = options[0].id!;
          this.tourChanged();
          this.cdr.markForCheck();
        });
      }
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadOlderToursIfNeeded();
  }

  protected tourLabel(tour: Tour): string {
    return tourOptionLabel(tour, this.md);
  }

  protected vehicleHint(): string {
    const number = normalizeVehicleNumber(this.vehicle());
    return !number || this.md.vehicle(number) ? '' : 'Unbekannte Nummer – wird so übernommen.';
  }

  /** Active persons plus the selected one, even if inactive. */
  protected personOptions(selected: string): Person[] {
    const current = this.md.person(selected);
    const active = this.md.activePersons();
    return current && !current.active ? [...active, current] : active;
  }

  private async loadOlderToursIfNeeded(): Promise<void> {
    const at = this.alarm();
    if (at && !this.journal.activeToursAt(at)) {
      this.olderTours.set(await this.journal.toursForAlarm(at));
    }
  }

  protected async alarmChanged(): Promise<void> {
    this.alarm.set(fromLocalInput(this.alarmAt));
    await this.loadOlderToursIfNeeded();
    if (!this.crewTouched) this.applyTourDefaults();
    // Plain fields changed after an await: tell the zoneless change detection.
    this.cdr.markForCheck();
  }

  protected tourChanged(): void {
    this.crewTouched = false;
    this.applyTourDefaults();
  }

  /** Vehicle from the tour's home vehicle and crew from the members on duty at the alarm time. */
  private applyTourDefaults(): void {
    const tour = this.tourOptions().find(t => t.id === this.tourId);
    const at = fromLocalInput(this.alarmAt);
    if (!tour || !at) return;
    const prefill = this.journal.prefillRide(tour, at);
    this.vehicle.set(prefill.vehicleIds[0] ?? '');
    this.crew = prefill.crew.map(c => ({key: newId(), ...c}));
  }

  protected addCrew(): void {
    this.crewTouched = true;
    this.crew = [...this.crew, {key: newId(), personId: '', role: 'THIRD'}];
  }

  protected removeCrew(row: CrewRow): void {
    this.crewTouched = true;
    this.crew = this.crew.filter(r => r !== row);
  }

  protected async save(): Promise<void> {
    const ride: Ride = {
      id: this.data.ride?.id,
      audit: this.data.ride?.audit,
      tourId: this.tourId,
      kind: 'TRANSPORT',
      vehicleIds: normalizeVehicleNumber(this.vehicle()) ? [normalizeVehicleNumber(this.vehicle())] : [],
      resources: this.resources(),
      alarmAt: fromLocalInput(this.alarmAt) ?? new Date(NaN),
      returnedAt: fromLocalInput(this.returnedAt),
      crew: this.crew.filter(c => !!c.personId).map(({personId, role}) => ({personId, role})),
      type: this.type,
      category: this.category,
      patient: this.patient,
      pickup: this.pickup.trim() || undefined,
      destination: this.destination.trim() || undefined,
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
