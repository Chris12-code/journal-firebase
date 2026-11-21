import {DocumentData, Timestamp} from 'firebase/firestore';
import {Audit, CrewMember, Person, Ride, RideCrewEntry, Tour, Vehicle, VehicleType} from '../domain/model';
import {normalizeResources} from '../domain/ride';
import {tourEnd, tourStart} from '../domain/tour';
import {UserEntry} from '../domain/user';

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

/** User entries (design D1). Unknown roles and missing flags fall back to the least access. */
export function docToUserEntry(uid: string, data: DocumentData): UserEntry {
  return {
    uid,
    email: String(data['email'] ?? ''),
    name: String(data['name'] ?? ''),
    role: data['role'] === 'ADMIN' ? 'ADMIN' : 'STATION',
    active: data['active'] === true,
  };
}

export function userEntryToDoc(entry: Omit<UserEntry, 'uid'>): DocumentData {
  return {email: entry.email.trim(), name: entry.name.trim(), role: entry.role, active: entry.active};
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
  const tour: Tour = {
    id,
    kind: data['kind'] === 'EXTRA' ? 'EXTRA' : 'SHIFT',
    shift: data['shift'],
    homeVehicleId: optional(data['homeVehicleId']),
    members,
    audit: docToAudit(data),
  };
  const slotKey = optional<string>(data['slotKey']);
  return slotKey ? {...tour, slotKey} : tour;
}

/** Tour fields to store, without author stamps. `start`/`end` are derived for querying only. */
export function tourToDoc(tour: Tour): DocumentData {
  return {
    kind: tour.kind ?? 'SHIFT',
    slotKey: orNull(tour.slotKey),
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
  // Legacy documents had a single `vehicleId`.
  const vehicleIds: string[] = Array.isArray(data['vehicleIds'])
    ? data['vehicleIds'].filter((v: unknown) => typeof v === 'string' && v)
    : data['vehicleId'] ? [data['vehicleId']] : [];
  return {
    id,
    kind: data['kind'] === 'AMBULANCE' ? 'AMBULANCE' : 'TRANSPORT',
    tourId: optional(data['tourId']),
    vehicleIds,
    alarmAt: toDate(data['alarmAt'])!,
    returnedAt: toDate(data['returnedAt']),
    crew,
    type: optional(data['type']),
    category: optional(data['category']),
    patient: optional(data['patient']),
    pickup: optional(data['pickup']),
    destination: optional(data['destination']),
    event: optional(data['event']),
    assistances: typeof data['assistances'] === 'number' ? data['assistances'] : undefined,
    resources: Array.isArray(data['resources']) ? data['resources'].filter((r: unknown) => typeof r === 'string') : [],
    audit: docToAudit(data),
  };
}

/** Ride fields to store, without author stamps. */
export function rideToDoc(ride: Ride): DocumentData {
  return {
    kind: ride.kind ?? 'TRANSPORT',
    tourId: orNull(ride.tourId),
    vehicleIds: ride.vehicleIds.map(v => v.trim()).filter(Boolean),
    alarmAt: toTimestamp(ride.alarmAt),
    returnedAt: toTimestamp(ride.returnedAt),
    crew: ride.crew.map(c => ({personId: c.personId, role: c.role})),
    type: orNull(ride.type),
    category: orNull(ride.category),
    patient: orNull(ride.patient),
    pickup: orNull(ride.pickup),
    destination: orNull(ride.destination),
    event: orNull(ride.event),
    assistances: ride.assistances ?? null,
    resources: normalizeResources(ride.resources),
  };
}
