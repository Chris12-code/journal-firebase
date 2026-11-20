import {DocumentData, Timestamp} from 'firebase/firestore';
import {Audit, CrewMember, Person, Ride, RideCrewEntry, Tour, Vehicle, VehicleType} from '../domain/model';
import {tourEnd, tourStart} from '../domain/tour';

// The only place that knows the Firestore document shapes (design D3).
// Timestamps never leave this file; optional fields are stored as explicit null.

/** Converts a stored time to a Date. Accepts Timestamp, Date or null/undefined. */
export function toDate(value: unknown): Date | undefined {
  if (value == null) return undefined;
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  if (typeof (value as {toDate?: unknown}).toDate === 'function') return (value as {toDate(): Date}).toDate();
  return undefined;
}

const toTimestamp = (d: Date | undefined): Timestamp | null => (d ? Timestamp.fromDate(d) : null);
const optional = <T>(v: T | null | undefined): T | undefined => (v == null || v === '' ? undefined : v);
const orNull = <T>(v: T | undefined): T | null => (v === undefined || v === '' ? null : v);

export function docToPerson(id: string, data: DocumentData): Person {
  return {
    number: id,
    name: String(data['name'] ?? id),
    phone: optional(data['phone']),
    email: optional(data['email']),
    // Documents created by hand without the flag count as active.
    active: data['active'] !== false,
  };
}

export function docToVehicle(id: string, data: DocumentData): Vehicle {
  return {number: id, type: data['type'] as VehicleType, active: data['active'] !== false};
}

function docToAudit(data: DocumentData): Audit | undefined {
  if (!data['createdBy']) return undefined;
  return {
    createdBy: data['createdBy'],
    createdAt: toDate(data['createdAt']) ?? new Date(),
    updatedBy: data['updatedBy'] ?? data['createdBy'],
    updatedAt: toDate(data['updatedAt']) ?? new Date(),
  };
}

export function docToTour(id: string, data: DocumentData): Tour {
  const members: CrewMember[] = (data['members'] ?? []).map((m: DocumentData) => {
    const member: CrewMember = {id: m['id'], personId: m['personId'], role: m['role'], from: toDate(m['from'])!};
    const to = toDate(m['to']);
    return to ? {...member, to} : member;
  });
  return {id, shift: data['shift'], homeVehicleId: optional(data['homeVehicleId']), members, audit: docToAudit(data)};
}

/** Tour fields to store, without author stamps. `start`/`end` are derived for querying only. */
export function tourToDoc(tour: Tour): DocumentData {
  return {
    shift: tour.shift,
    homeVehicleId: orNull(tour.homeVehicleId),
    members: tour.members.map(m => ({
      id: m.id,
      personId: m.personId,
      role: m.role,
      from: toTimestamp(m.from),
      to: toTimestamp(m.to),
    })),
    start: toTimestamp(tourStart(tour)),
    end: toTimestamp(tourEnd(tour)),
  };
}

export function docToRide(id: string, data: DocumentData): Ride {
  const crew: RideCrewEntry[] = (data['crew'] ?? []).map((c: DocumentData) => ({personId: c['personId'], role: c['role']}));
  return {
    id,
    tourId: data['tourId'],
    vehicleId: data['vehicleId'],
    alarmAt: toDate(data['alarmAt'])!,
    returnedAt: toDate(data['returnedAt']),
    crew,
    type: optional(data['type']),
    category: optional(data['category']),
    patient: optional(data['patient']),
    pickup: optional(data['pickup']),
    destination: optional(data['destination']),
    audit: docToAudit(data),
  };
}

/** Ride fields to store, without author stamps. */
export function rideToDoc(ride: Ride): DocumentData {
  return {
    tourId: ride.tourId,
    vehicleId: ride.vehicleId,
    alarmAt: toTimestamp(ride.alarmAt),
    returnedAt: toTimestamp(ride.returnedAt),
    crew: ride.crew.map(c => ({personId: c.personId, role: c.role})),
    type: orNull(ride.type),
    category: orNull(ride.category),
    patient: orNull(ride.patient),
    pickup: orNull(ride.pickup),
    destination: orNull(ride.destination),
  };
}
