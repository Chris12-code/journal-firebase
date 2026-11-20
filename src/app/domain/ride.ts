import {Ride, RIDE_TYPES, RideCrewEntry, Tour, ValidationError} from './model';
import {activeMembersAt, isActiveAt} from './tour';

// Ride rules (spec rides, design D2/D4).

/** Tours that have at least one member on duty at the given time. */
export function toursActiveAt(tours: Tour[], at: Date): Tour[] {
  return tours.filter(t => isActiveAt(t, at));
}

/** Crew snapshot from the tour members active at the given time. */
export function crewAt(tour: Tour, at: Date): RideCrewEntry[] {
  return activeMembersAt(tour, at).map(m => ({personId: m.personId, role: m.role}));
}

/**
 * Pre-fills tour-dependent fields of a transport: the vehicle defaults to the tour's home vehicle
 * (none when the tour has none) and the crew to the members active at the alarm time.
 */
export function prefillRide(tour: Tour, alarmAt: Date): Pick<Ride, 'kind' | 'tourId' | 'vehicleIds' | 'crew' | 'alarmAt'> {
  return {
    kind: 'TRANSPORT',
    tourId: tour.id ?? '',
    vehicleIds: tour.homeVehicleId ? [tour.homeVehicleId] : [],
    alarmAt,
    crew: crewAt(tour, alarmAt),
  };
}

/** Trimmed resources without empty entries and without duplicates (case-insensitive, first spelling wins). */
export function normalizeResources(resources: readonly string[] | undefined): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of resources ?? []) {
    const value = raw.trim();
    const key = value.toLocaleLowerCase('de');
    if (value && !seen.has(key)) {
      seen.add(key);
      result.push(value);
    }
  }
  return result;
}

const isValidDate = (d: unknown): d is Date => d instanceof Date && !isNaN(d.getTime());

/** Checks the rules that prevent saving. An empty list means the ride is valid. */
export function validateRide(ride: Ride): ValidationError[] {
  return ride.kind === 'AMBULANCE' ? validateAmbulance(ride) : validateTransport(ride);
}

function validateTransport(ride: Ride): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!isValidDate(ride.alarmAt)) {
    errors.push({code: 'MISSING_ALARM', message: 'Bitte die Alarmierungszeit angeben.'});
  } else if (ride.returnedAt && ride.returnedAt.getTime() <= ride.alarmAt.getTime()) {
    errors.push({code: 'INVALID_RANGE', message: 'Die Rückkehr muss nach der Alarmierung liegen.'});
  }
  if (!ride.tourId) {
    errors.push({code: 'MISSING_TOUR', message: 'Bitte eine Tour wählen.'});
  }
  const vehicles = ride.vehicleIds.filter(v => !!v.trim());
  if (vehicles.length === 0) {
    errors.push({code: 'MISSING_VEHICLE', message: 'Bitte ein Fahrzeug wählen.'});
  } else if (vehicles.length > 1) {
    errors.push({code: 'TOO_MANY_VEHICLES', message: 'Eine Fahrt hat genau ein Fahrzeug.'});
  }
  if (!ride.crew.some(c => !!c.personId)) {
    errors.push({code: 'EMPTY_CREW', message: 'Eine Fahrt braucht mindestens eine Person in der Besatzung.'});
  }
  if (!ride.type || !RIDE_TYPES.includes(ride.type)) {
    errors.push({code: 'MISSING_TYPE', message: 'Bitte die Art der Fahrt (NA/RD/KT) wählen.'});
  }
  return errors;
}

function validateAmbulance(ride: Ride): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!ride.event?.trim()) {
    errors.push({code: 'MISSING_EVENT', message: 'Bitte die Veranstaltung bzw. den Ort angeben.'});
  }
  if (!isValidDate(ride.alarmAt)) {
    errors.push({code: 'MISSING_START', message: 'Bitte den Beginn der Ambulanz angeben.'});
  }
  if (!isValidDate(ride.returnedAt)) {
    errors.push({code: 'MISSING_END', message: 'Bitte das Ende der Ambulanz angeben.'});
  } else if (isValidDate(ride.alarmAt) && ride.returnedAt.getTime() <= ride.alarmAt.getTime()) {
    errors.push({code: 'INVALID_RANGE', message: 'Das Ende muss nach dem Beginn liegen.'});
  }
  if (ride.tourId) {
    errors.push({code: 'TOUR_ON_AMBULANCE', message: 'Eine Ambulanz gehört zu keiner Tour.'});
  }
  if (ride.assistances != null && (!Number.isInteger(ride.assistances) || ride.assistances < 0)) {
    errors.push({code: 'INVALID_ASSISTANCES', message: 'Die Zahl der Hilfeleistungen muss 0 oder größer sein.'});
  }
  if (!ride.crew.some(c => !!c.personId)) {
    errors.push({code: 'EMPTY_CREW', message: 'Eine Ambulanz braucht mindestens eine Person.'});
  }
  return errors;
}
