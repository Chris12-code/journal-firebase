import {contains, overlaps} from './interval';
import {CrewMember, Role, SHIFTS, Tour, ValidationError} from './model';

// Tour rules (spec "tours", design D2). All operations are immutable and return a new tour.

export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/** Earliest member start, or undefined for a tour without members. */
export function tourStart(tour: Tour): Date | undefined {
  if (tour.members.length === 0) return undefined;
  return new Date(Math.min(...tour.members.map(m => m.from.getTime())));
}

/** Latest member end, but only once every member entry is closed. */
export function tourEnd(tour: Tour): Date | undefined {
  if (tour.members.length === 0 || isActive(tour)) return undefined;
  return new Date(Math.max(...tour.members.map(m => m.to!.getTime())));
}

/** A tour is active while at least one member entry is open. */
export function isActive(tour: Tour): boolean {
  return tour.members.some(m => !m.to);
}

/** Members on duty at the given moment. */
export function activeMembersAt(tour: Tour, at: Date): CrewMember[] {
  return tour.members.filter(m => contains(m, at));
}

/** True when at least one member is on duty at the given moment. */
export function isActiveAt(tour: Tour, at: Date): boolean {
  return activeMembersAt(tour, at).length > 0;
}

export interface NewMember {
  personId: string;
  role: Role;
  from: Date;
  to?: Date;
}

/** Adds a crew member entry. */
export function addMember(tour: Tour, member: NewMember, id: string = newId()): Tour {
  return {...tour, members: [...tour.members, {id, ...member}]};
}

/** Ends one member's participation at the given time; the tour continues. */
export function endMember(tour: Tour, memberId: string, at: Date): Tour {
  return {...tour, members: tour.members.map(m => (m.id === memberId ? {...m, to: at} : m))};
}

/** Replaces fields of a member entry, e.g. to correct a wrong person or time. */
export function updateMember(tour: Tour, memberId: string, patch: Partial<Omit<CrewMember, 'id'>>): Tour {
  return {...tour, members: tour.members.map(m => (m.id === memberId ? {...m, ...patch} : m))};
}

/** Removes a member entry entirely (corrections only). */
export function removeMember(tour: Tour, memberId: string): Tour {
  return {...tour, members: tour.members.filter(m => m.id !== memberId)};
}

/** Replaces a member at the given time: ends the old entry and starts a new one in the same role. */
export function replaceMember(tour: Tour, memberId: string, newPersonId: string, at: Date, id: string = newId()): Tour {
  const old = tour.members.find(m => m.id === memberId);
  if (!old) return tour;
  return addMember(endMember(tour, memberId, at), {personId: newPersonId, role: old.role, from: at}, id);
}

/**
 * Two members swap roles at the given time. Each current entry is ended and a new
 * entry with the other's role is started, so hours stay attributed correctly.
 */
export function swapRoles(tour: Tour, memberIdA: string, memberIdB: string, at: Date, ids: [string, string] = [newId(), newId()]): Tour {
  const a = tour.members.find(m => m.id === memberIdA);
  const b = tour.members.find(m => m.id === memberIdB);
  if (!a || !b) return tour;
  let next = endMember(endMember(tour, a.id, at), b.id, at);
  next = addMember(next, {personId: a.personId, role: b.role, from: at}, ids[0]);
  return addMember(next, {personId: b.personId, role: a.role, from: at}, ids[1]);
}

/** Ends the tour: every open member entry gets the given end time. */
export function endTour(tour: Tour, at: Date): Tour {
  return {...tour, members: tour.members.map(m => (m.to ? m : {...m, to: at}))};
}

/** Checks the rules that prevent saving. An empty list means the tour is valid. */
export function validateTour(tour: Tour): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!SHIFTS.includes(tour.shift)) {
    errors.push({code: 'MISSING_SHIFT', message: 'Bitte eine Schicht (Tag/Nacht) wählen.'});
  }
  if (tour.members.length === 0) {
    errors.push({code: 'NO_CREW', message: 'Eine Tour braucht mindestens ein Besatzungsmitglied.'});
  }
  for (const m of tour.members) {
    if (!m.personId) {
      errors.push({code: 'MISSING_PERSON', message: 'Bitte für jeden Eintrag eine Person wählen.', memberId: m.id});
    }
    if (!(m.from instanceof Date) || isNaN(m.from.getTime())) {
      errors.push({code: 'MISSING_FROM', message: 'Bitte für jeden Eintrag eine Beginnzeit angeben.', memberId: m.id});
    } else if (m.to && m.to.getTime() <= m.from.getTime()) {
      errors.push({code: 'INVALID_RANGE', message: 'Das Ende muss nach dem Beginn liegen.', memberId: m.id});
    }
  }
  return errors;
}

export interface OverlapWarning {
  memberId: string;
  personId: string;
  conflictTourId?: string;
  conflictMemberId: string;
  /** True when the conflicting entry is in the same tour. */
  sameTour: boolean;
}

/** All entries of a person (except `excludeMemberId`) overlapping the given span, across the given tours. */
export function findOverlaps(
  personId: string,
  interval: {from: Date; to?: Date},
  tours: Tour[],
  excludeMemberId?: string,
): {tour: Tour; member: CrewMember}[] {
  const result: {tour: Tour; member: CrewMember}[] = [];
  for (const tour of tours) {
    for (const member of tour.members) {
      if (member.id !== excludeMemberId && member.personId === personId && overlaps(member, interval)) {
        result.push({tour, member});
      }
    }
  }
  return result;
}

/**
 * Warnings for every member of `tour` that overlaps another entry of the same person,
 * in the same tour or in one of `otherTours`. Warnings do not block saving.
 */
export function overlapWarnings(tour: Tour, otherTours: Tour[]): OverlapWarning[] {
  const others = otherTours.filter(t => !tour.id || t.id !== tour.id);
  const all = [tour, ...others];
  const warnings: OverlapWarning[] = [];
  for (const member of tour.members) {
    if (!member.personId) continue;
    for (const hit of findOverlaps(member.personId, member, all, member.id)) {
      warnings.push({
        memberId: member.id,
        personId: member.personId,
        conflictTourId: hit.tour.id,
        conflictMemberId: hit.member.id,
        sameTour: hit.tour === tour,
      });
    }
  }
  return warnings;
}
