import {Ride, RIDE_TYPES, RideCrewEntry, Tour, ValidationError} from './model';
import {activeMembersAt, isActiveAt} from './tour';

// Ride rules (spec "rides", design D2).

/** Tours that have at least one member on duty at the given time. */
export function toursActiveAt(tours: Tour[], at: Date): Tour[] {
  return tours.filter(t => isActiveAt(t, at));
}

/** Crew snapshot from the tour members active at the given time. */
export function crewAt(tour: Tour, at: Date): RideCrewEntry[] {
  return activeMembersAt(tour, at).map(m => ({personId: m.personId, role: m.role}));
}

/**
 * Pre-fills tour-dependent ride fields: the vehicle defaults to the tour's home vehicle
 * (empty when the tour has none) and the crew to the members active at the alarm time.
 */
export function prefillRide(tour: Tour, alarmAt: Date): Pick<Ride, 'tourId' | 'vehicleId' | 'crew' | 'alarmAt'> {
  return {
    tourId: tour.id ?? '',
    vehicleId: tour.homeVehicleId ?? '',
    alarmAt,
    crew: crewAt(tour, alarmAt),
  };
}

const isValidDate = (d: unknown): d is Date => d instanceof Date && !isNaN(d.getTime());

/** Checks the rules that prevent saving. An empty list means the ride is valid. */
export function validateRide(ride: Ride): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!isValidDate(ride.alarmAt)) {
    errors.push({code: 'MISSING_ALARM', message: 'Bitte die Alarmierungszeit angeben.'});
  } else if (ride.returnedAt && ride.returnedAt.getTime() <= ride.alarmAt.getTime()) {
    errors.push({code: 'INVALID_RANGE', message: 'Die Rückkehr muss nach der Alarmierung liegen.'});
  }
  if (!ride.tourId) {
    errors.push({code: 'MISSING_TOUR', message: 'Bitte eine Tour wählen.'});
  }
  if (!ride.vehicleId) {
    errors.push({code: 'MISSING_VEHICLE', message: 'Bitte ein Fahrzeug wählen.'});
  }
  if (!ride.crew.some(c => !!c.personId)) {
    errors.push({code: 'EMPTY_CREW', message: 'Eine Fahrt braucht mindestens eine Person in der Besatzung.'});
  }
  if (!ride.type || !RIDE_TYPES.includes(ride.type)) {
    errors.push({code: 'MISSING_TYPE', message: 'Bitte die Art der Fahrt (NA/RD/KT) wählen.'});
  }
  return errors;
}
