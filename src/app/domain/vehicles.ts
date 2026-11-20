import {Vehicle} from './model';

// Vehicles (spec master-data): built-in defaults, overridable by stored master data.
// Any other vehicle number may still be entered on tours and rides.

/** Vehicles the journal knows without any master data in the backend. */
export const DEFAULT_VEHICLES: readonly Vehicle[] = [
  {number: '44.201', type: 'RTW', active: true},
  {number: '44.301', type: 'KTW', active: true},
  {number: '20.410', type: 'BTW', active: true},
];

/** Defaults merged with stored vehicles; a stored vehicle with the same number replaces the default. */
export function withDefaultVehicles(stored: Vehicle[]): Vehicle[] {
  const byNumber = new Map(DEFAULT_VEHICLES.map(v => [v.number, v]));
  for (const v of stored) byNumber.set(normalizeVehicleNumber(v.number), {...v, number: normalizeVehicleNumber(v.number)});
  return [...byNumber.values()];
}

/** Vehicle numbers are free text; surrounding whitespace is not part of the number. */
export function normalizeVehicleNumber(value: string | undefined): string {
  return (value ?? '').trim();
}
