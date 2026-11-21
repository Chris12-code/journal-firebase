import {ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, signal, untracked} from '@angular/core';
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
  CrewPosition,
  PATIENT_TYPES,
  PatientType,
  RESOURCE_SUGGESTIONS,
  Ride,
  RIDE_CATEGORIES,
  RIDE_TYPES,
  RideCategory,
  RideType,
  ROLE_LABELS,
  ROLES,
  Tour,
} from '../../domain/model';
import {toursActiveAt} from '../../domain/ride';
import {isActiveAt, newId, tourEnd, tourStart} from '../../domain/tour';
import {normalizeVehicleNumber} from '../../domain/vehicles';
import {ChipListInputComponent, ChipOption} from '../shared/chip-list-input.component';
import {formatTime, nowMinute} from '../shared/datetime';
import {DateTimeFieldComponent} from '../shared/datetime-field.component';
import {backendErrorMessage, joinErrors} from '../shared/errors';
import {PersonFieldComponent} from '../shared/person-field.component';
import {tourOptionLabel} from '../tours/tour-text';

export interface RideDialogData {
  /** Existing ride to edit; omitted for a new ride. */
  ride?: Ride;
  /** Tour to preselect for a new ride (e.g. "Fahrt erfassen" on a tour card). */
  tourId?: string;
}

interface CrewRow {
  key: string;
  personId: string;
  role: CrewPosition;
}

const byStartDesc = (a: Tour, b: Tour) => (tourStart(b)?.getTime() ?? 0) - (tourStart(a)?.getTime() ?? 0);

/** Logs or edits a ride (spec rides): tour, vehicle actually used, crew snapshot and classification. */
@Component({
  selector: 'app-ride-dialog',
  imports: [
    ChipListInputComponent,
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
    <h2 mat-dialog-title>{{ isNew ? 'Neue Fahrt' : 'Fahrt bearbeiten' }}</h2>
    <mat-dialog-content>
      <div class="dialog-form">
        <app-datetime-field label="Alarmierung" [value]="alarm()" (valueChange)="alarmChanged($event)" />

        <mat-form-field>
          <mat-label>Tour</mat-label>
          <mat-select [ngModel]="tourId()" (ngModelChange)="tourChanged($event)" name="tour">
            @if (tourGroups().active.length) {
              <mat-optgroup label="Aktiv zur Alarmzeit">
                @for (t of tourGroups().active; track t.id) {
                  <mat-option [value]="t.id">{{ tourLabel(t) }}</mat-option>
                }
              </mat-optgroup>
            }
            @if (tourGroups().others.length) {
              <mat-optgroup label="Weitere Touren">
                @for (t of tourGroups().others; track t.id) {
                  <mat-option [value]="t.id">{{ tourLabel(t) }}</mat-option>
                }
              </mat-optgroup>
            }
            @if (!tourGroups().active.length && !tourGroups().others.length) {
              <mat-option disabled>Keine Tour vorhanden</mat-option>
            }
          </mat-select>
          <mat-hint>Die Auswahl übernimmt Fahrzeug und Besatzung der Tour.</mat-hint>
        </mat-form-field>
        @if (notActiveWarning()) {
          <p class="warning-text">{{ notActiveWarning() }}</p>
        }
        @if (extensionHint()) {
          <p class="warning-text">{{ extensionHint() }}</p>
        }

        <mat-form-field floatLabel="always">
          <mat-label>Fahrzeug</mat-label>
          <input matInput [ngModel]="vehicle()" (ngModelChange)="vehicle.set($event)" name="vehicle" [matAutocomplete]="vehicleAuto" placeholder="z. B. 44.201">
          <mat-autocomplete #vehicleAuto="matAutocomplete">
            @for (v of vehicleSuggestions(); track v.number) {
              <mat-option [value]="v.number">{{ v.number }} ({{ v.type }})</mat-option>
            }
          </mat-autocomplete>
          @if (vehicleHint()) {
            <mat-hint>{{ vehicleHint() }}</mat-hint>
          }
        </mat-form-field>

        <fieldset class="crew">
          <legend>Besatzung</legend>
          @for (row of crew(); track row.key; let i = $index) {
            <div class="crew-row">
              <mat-form-field class="role">
                <mat-label>Rolle {{ i + 1 }}</mat-label>
                <mat-select [(ngModel)]="row.role" [name]="'role-' + row.key" (selectionChange)="crewTouched = true">
                  @for (r of roles; track r) {
                    <mat-option [value]="r">{{ roleLabels[r] }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
              <app-person-field
                class="person"
                [label]="'Person ' + (i + 1)"
                [personId]="row.personId"
                (personIdChange)="setPerson(row, $event)"
                [exclude]="chosenPersons()"
              />
              <button mat-icon-button type="button" (click)="removeCrew(row)" [attr.aria-label]="'Entfernen ' + (md.personName(row.personId) || 'Person ' + (i + 1))">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          }
          <div><button mat-button type="button" (click)="addCrew()"><mat-icon>person_add</mat-icon> Person hinzufügen</button></div>
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

        <app-datetime-field label="Rückkehr" [reference]="alarm()" [(value)]="returnedAt" />

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
    .crew-row .role { flex: 1 1 150px; }
    .crew-row .person { flex: 2 1 220px; }
    .crew-row button { margin-top: 4px; }
  `,
})
export class RideDialogComponent implements OnInit {
  private readonly data = inject<RideDialogData>(MAT_DIALOG_DATA);
  private readonly ref = inject(MatDialogRef<RideDialogComponent, string>);
  private readonly journal = inject(JournalService);
  protected readonly md = inject(MasterDataService);

  protected readonly roles = ROLES;
  protected readonly roleLabels = ROLE_LABELS;
  protected readonly rideTypes = RIDE_TYPES;
  protected readonly categories = RIDE_CATEGORIES;
  protected readonly patients = PATIENT_TYPES;

  protected readonly isNew = !this.data.ride;
  protected readonly resourceOptions: ChipOption[] = RESOURCE_SUGGESTIONS.map(r => ({value: r, label: r}));
  protected readonly resources = signal<string[]>(this.data.ride?.resources ?? []);
  protected readonly alarm = signal<Date | undefined>(this.data.ride?.alarmAt ?? nowMinute());
  protected readonly returnedAt = signal<Date | undefined>(this.data.ride?.returnedAt);
  protected readonly tourId = signal(this.data.ride?.tourId ?? this.data.tourId ?? '');
  /** Free-text vehicle number; a signal so the suggestions stay stable between change detection runs. */
  protected readonly vehicle = signal(this.data.ride?.vehicleIds[0] ?? '');
  protected readonly vehicleSuggestions = computed(() => this.md.suggestVehicles(this.vehicle()));
  protected readonly crew = signal<CrewRow[]>((this.data.ride?.crew ?? []).map(c => ({key: newId(), ...c})));
  protected readonly chosenPersons = computed(() => this.crew().map(r => r.personId).filter(Boolean));
  protected crewTouched = !this.isNew;
  protected type: RideType | undefined = this.data.ride?.type;
  protected category: RideCategory | undefined = this.data.ride?.category;
  protected patient: PatientType | undefined = this.data.ride?.patient;
  protected pickup = this.data.ride?.pickup ?? '';
  protected destination = this.data.ride?.destination ?? '';

  /** Tours loaded on demand for an alarm time before the display window. */
  private readonly olderTours = signal<Tour[]>([]);

  /** The ride's own tour when editing, also when it is no longer current (loaded on demand for old rides). */
  private readonly ownTour = computed(() => {
    const id = this.data.ride?.tourId;
    return id ? (this.journal.tourById(id) ?? this.olderTours().find(t => t.id === id)) : undefined;
  });

  /** Current tours (as on the Dienstmannschaft page) plus the own tour; those active at the alarm time first. */
  protected readonly tourGroups = computed(() => {
    const byId = new Map<string, Tour>();
    const own = this.ownTour();
    for (const t of [...this.journal.currentTours(), ...(own ? [own] : [])]) {
      if (t.id) byId.set(t.id, t);
    }
    const all = [...byId.values()];
    const at = this.alarm();
    const active = at ? toursActiveAt(all, at).sort(byStartDesc) : [];
    const others = all.filter(t => !active.includes(t)).sort(byStartDesc);
    return {active, others, all};
  });

  private readonly selectedTour = computed(() => this.tourGroups().all.find(t => t.id === this.tourId()));

  protected readonly notActiveWarning = computed(() => {
    const tour = this.selectedTour();
    const at = this.alarm();
    return tour && at && !isActiveAt(tour, at) ? 'Die Tour war zur Alarmzeit nicht aktiv.' : '';
  });

  /** Hint when saving would move the end of the (ended) tour to this ride's end. */
  protected readonly extensionHint = computed(() => {
    const tour = this.selectedTour();
    const end = this.returnedAt() ?? this.alarm();
    if (!tour || !end) return '';
    const extendedTo = this.journal.tourExtension({
      kind: 'TRANSPORT',
      tourId: tour.id,
      alarmAt: this.alarm() ?? end,
      returnedAt: this.returnedAt(),
      vehicleIds: [],
      crew: [],
    });
    const oldEnd = tourEnd(tour);
    return extendedTo && oldEnd ? `Das Tour-Ende (${formatTime(oldEnd)}) wird auf ${formatTime(extendedTo)} verlängert.` : '';
  });

  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  constructor() {
    // A new ride picks the tour automatically as soon as exactly one is active (tours may still be loading).
    effect(() => {
      const {active} = this.tourGroups();
      if (this.isNew && active.length === 1 && !untracked(this.tourId)) {
        untracked(() => this.tourChanged(active[0].id!));
      }
    });
  }

  async ngOnInit(): Promise<void> {
    if (this.isNew && this.data.tourId) this.applyTourDefaults();
    await this.loadOlderToursIfNeeded();
  }

  protected tourLabel(tour: Tour): string {
    return tourOptionLabel(tour, this.md);
  }

  protected vehicleHint(): string {
    const number = normalizeVehicleNumber(this.vehicle());
    return !number || this.md.vehicle(number) ? '' : 'Unbekannte Nummer – wird so übernommen.';
  }

  private async loadOlderToursIfNeeded(): Promise<void> {
    const at = this.alarm();
    if (at && !this.journal.activeToursAt(at)) {
      this.olderTours.set(await this.journal.toursForAlarm(at));
    }
  }

  protected async alarmChanged(at: Date | undefined): Promise<void> {
    this.alarm.set(at);
    if (!this.crewTouched) this.applyTourDefaults();
    await this.loadOlderToursIfNeeded();
  }

  protected tourChanged(id: string): void {
    this.tourId.set(id);
    this.crewTouched = false;
    this.applyTourDefaults();
  }

  /** Vehicle from the tour's home vehicle and crew from the members on duty at the alarm time. */
  private applyTourDefaults(): void {
    const tour = this.selectedTour();
    if (!tour) return;
    const prefill = this.journal.prefillRide(tour, this.alarm() ?? nowMinute());
    this.vehicle.set(prefill.vehicleIds[0] ?? '');
    this.crew.set(prefill.crew.map(c => ({key: newId(), ...c})));
  }

  protected setPerson(row: CrewRow, personId: string): void {
    this.crewTouched = true;
    this.crew.update(rows => rows.map(r => (r === row ? {...r, personId} : r)));
  }

  protected addCrew(): void {
    this.crewTouched = true;
    this.crew.update(rows => [...rows, {key: newId(), personId: '', role: 'THIRD'}]);
  }

  protected removeCrew(row: CrewRow): void {
    this.crewTouched = true;
    this.crew.update(rows => rows.filter(r => r !== row));
  }

  protected async save(): Promise<void> {
    const vehicle = normalizeVehicleNumber(this.vehicle());
    const ride: Ride = {
      id: this.data.ride?.id,
      audit: this.data.ride?.audit,
      tourId: this.tourId(),
      kind: 'TRANSPORT',
      vehicleIds: vehicle ? [vehicle] : [],
      resources: this.resources(),
      alarmAt: this.alarm() ?? new Date(NaN),
      returnedAt: this.returnedAt(),
      crew: this.crew().filter(c => !!c.personId).map(({personId, role}) => ({personId, role})),
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
