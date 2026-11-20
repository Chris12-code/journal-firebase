// Domain types of the journal sheet (design D2).
// Plain TypeScript: no Angular, no Firebase, no other layers.

export type Role = 'DRIVER' | 'TPF' | 'THIRD';
export const ROLES: readonly Role[] = ['DRIVER', 'TPF', 'THIRD'];
export const ROLE_LABELS: Record<Role, string> = {DRIVER: 'Fahrer', TPF: 'Transportführer', THIRD: 'Dritter'};

export type Shift = 'DAY' | 'NIGHT';
export const SHIFTS: readonly Shift[] = ['DAY', 'NIGHT'];
export const SHIFT_LABELS: Record<Shift, string> = {DAY: 'Tag', NIGHT: 'Nacht'};

export type VehicleType = 'RTW' | 'KTW' | 'BTW';

export type RideType = 'NA' | 'RD' | 'KT';
export const RIDE_TYPES: readonly RideType[] = ['NA', 'RD', 'KT'];

export type RideCategory = 'CPR' | 'VU' | 'Kinder';
export const RIDE_CATEGORIES: readonly RideCategory[] = ['CPR', 'VU', 'Kinder'];

export type PatientType = 'Mann' | 'Frau' | 'Kind';
export const PATIENT_TYPES: readonly PatientType[] = ['Mann', 'Frau', 'Kind'];

export interface Person {
  /** Employee number, unique identifier. */
  number: string;
  name: string;
  phone?: string;
  email?: string;
  active: boolean;
}

export interface Vehicle {
  /** Vehicle number, e.g. "44.201", unique identifier. */
  number: string;
  type: VehicleType;
  active: boolean;
}

export interface Audit {
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}

/** One person in one role for one time span within a tour. `to` is missing while still on duty. */
export interface CrewMember {
  id: string;
  personId: string;
  role: Role;
  from: Date;
  to?: Date;
}

/** One shift on the journal sheet. The tour does not own a vehicle; the home vehicle is only a default. */
export interface Tour {
  /** Missing until the tour has been saved. */
  id?: string;
  shift: Shift;
  homeVehicleId?: string;
  members: CrewMember[];
  /** Set by the system when saved. */
  audit?: Audit;
}

export interface RideCrewEntry {
  personId: string;
  role: Role;
}

export interface Ride {
  /** Missing until the ride has been saved. */
  id?: string;
  tourId: string;
  /** The vehicle actually used. */
  vehicleId: string;
  alarmAt: Date;
  returnedAt?: Date;
  /** Frozen crew snapshot, independent of later tour edits. */
  crew: RideCrewEntry[];
  type?: RideType;
  category?: RideCategory;
  patient?: PatientType;
  pickup?: string;
  destination?: string;
  /** Set by the system when saved. */
  audit?: Audit;
}

/** A problem that prevents saving. `memberId` points to the offending crew entry, if any. */
export interface ValidationError {
  code: string;
  message: string;
  memberId?: string;
}
