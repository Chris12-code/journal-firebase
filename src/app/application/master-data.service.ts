import {computed, inject, Injectable} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {catchError, from, map, of, switchMap} from 'rxjs';
import {Person, Vehicle} from '../domain/model';
import {withDefaultVehicles} from '../domain/vehicles';
import {MasterDataRepository} from './ports';
import {SessionService} from './session.service';

const byName = (a: Person, b: Person) => a.name.localeCompare(b.name, 'de');
const byNumber = (a: Vehicle, b: Vehicle) => a.number.localeCompare(b.number);

/** Persons and vehicles (spec master-data), loaded once per login. */
@Injectable({providedIn: 'root'})
export class MasterDataService {
  private readonly repo = inject(MasterDataRepository);
  private readonly session = inject(SessionService);

  readonly persons = toSignal(
    this.session.user$.pipe(
      switchMap(u => (u ? from(this.repo.loadPersons()) : of([]))),
      catchError(err => {
        console.error('Personen konnten nicht geladen werden', err);
        return of([] as Person[]);
      }),
    ),
    {initialValue: [] as Person[]},
  );

  /** Built-in default vehicles merged with the stored ones (stored entries win). */
  readonly vehicles = toSignal(
    this.session.user$.pipe(
      switchMap(u => (u ? from(this.repo.loadVehicles()) : of([]))),
      map(stored => withDefaultVehicles(stored)),
      catchError(err => {
        console.error('Fahrzeuge konnten nicht geladen werden', err);
        return of(withDefaultVehicles([]));
      }),
    ),
    {initialValue: withDefaultVehicles([])},
  );

  /** Only active persons and vehicles are offered for new selections. */
  readonly activePersons = computed(() => this.persons().filter(p => p.active).sort(byName));
  readonly activeVehicles = computed(() => this.vehicles().filter(v => v.active).sort(byNumber));

  private readonly personById = computed(() => new Map(this.persons().map(p => [p.number, p])));
  private readonly vehicleById = computed(() => new Map(this.vehicles().map(v => [v.number, v])));

  person(id: string): Person | undefined {
    return this.personById().get(id);
  }

  vehicle(id: string): Vehicle | undefined {
    return this.vehicleById().get(id);
  }

  /** Display name, also for inactive persons; falls back to the employee number. */
  personName(id: string | undefined): string {
    if (!id) return '';
    return this.person(id)?.name ?? id;
  }

  /**
   * Suggestions for a free-text vehicle field: active vehicles matching the typed text.
   * When the text already is a known number (or empty), all active vehicles are offered.
   */
  suggestVehicles(text: string | undefined): Vehicle[] {
    const q = (text ?? '').trim();
    const active = this.activeVehicles();
    if (!q || this.vehicle(q)) return active;
    return active.filter(v => v.number.includes(q));
  }

  /** "44.201 (RTW)", also for inactive vehicles; falls back to the number. */
  vehicleLabel(id: string | undefined): string {
    if (!id) return '';
    const v = this.vehicle(id);
    return v ? `${v.number} (${v.type})` : id;
  }
}
