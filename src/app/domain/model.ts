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

/** SHIFT: planned duty, hours from member times. EXTRA: extra car, hours from its rides (spec tours). */
export type TourKind = 'SHIFT' | 'EXTRA';

/** One shift on the journal sheet. The tour does not own a vehicle; the home vehicle is only a default. */
export interface Tour {
  /** Missing until the tour has been saved. */
  id?: string;
  /** Missing means SHIFT. */
  kind?: TourKind;
  /** Key of the planned slot this shift tour occupies (see shift-plan.ts). */
  slotKey?: string;
  shift: Shift;
  homeVehicleId?: string;
  members: CrewMember[];
  /** Set by the system when saved. */
  audit?: Audit;
}

/**
 * Position of a person on a ride: a known code (the tour roles plus the ambulance positions)
 * or any free-text position, which is shown as entered.
 */
export type CrewPosition = string;

/** Fixed positions offered on ambulance shifts; anything else is free text. */
export const AMBULANCE_POSITIONS: readonly CrewPosition[] = ['DRIVER', 'TPF', 'MEDIC', 'LEAD', 'TRAINEE'];

export const POSITION_LABELS: Record<string, string> = {
  ...ROLE_LABELS,
  MEDIC: 'Sanitäter',
  LEAD: 'Einsatzleiter',
  TRAINEE: 'Praktikant',
};

/** German label of a known position code, otherwise the free-text position itself. */
export function positionLabel(position: CrewPosition): string {
  return POSITION_LABELS[position] ?? position;
}

/** Suggested additional resources; any other text may be entered. */
export const RESOURCE_SUGGESTIONS: readonly string[] = [
  'Notarzt',
  'Notarzthubschrauber',
  'Polizei',
  'Feuerwehr',
  'Bergrettung',
  'Wasserrettung',
];

export interface RideCrewEntry {
  personId: string;
  role: CrewPosition;
}

/** TRANSPORT: a ride of a tour. AMBULANCE: an ambulance shift at an event, recorded as one ride. */
export type RideKind = 'TRANSPORT' | 'AMBULANCE';

export interface Ride {
  /** Missing until the ride has been saved. */
  id?: string;
  /** Missing means TRANSPORT. */
  kind?: RideKind;
  /** Required for transports, absent for ambulance shifts. */
  tourId?: string;
  /** Vehicles actually used: exactly one for a transport, any number for an ambulance shift. */
  vehicleIds: string[];
  /** Alarm time; for an ambulance shift its start. */
  alarmAt: Date;
  /** Return time; for an ambulance shift its (required) end. */
  returnedAt?: Date;
  /** Frozen crew snapshot, independent of later tour edits. */
  crew: RideCrewEntry[];
  type?: RideType;
  category?: RideCategory;
  patient?: PatientType;
  pickup?: string;
  destination?: string;
  /** Ambulance shift: event or location. */
  event?: string;
  /** Ambulance shift: number of assistances given. */
  assistances?: number;
  /** Additional resources present (suggestions or free text). */
  resources?: string[];
  /** Set by the system when saved. */
  audit?: Audit;
}

/** A problem that prevents saving. `memberId` points to the offending crew entry, if any. */
export interface ValidationError {
  code: string;
  message: string;
  memberId?: string;
}
