// Users and roles (spec journal-access, design D1/D3).
// A user entry grants a login account access to the journal.

/** `STATION`: shared login for the daily work. `ADMIN`: personal login, also sees the report and maintains users. */
export type UserRole = 'STATION' | 'ADMIN';

export const USER_ROLES: readonly UserRole[] = ['STATION', 'ADMIN'];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  STATION: 'Station',
  ADMIN: 'Administrator',
};

export interface UserEntry {
  /** Login account id; also the document id. */
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
}

/** What a logged-in account may do: `NONE` without an active user entry. */
export type Access = 'NONE' | UserRole;

/** Access granted by a user entry, or `NONE` when there is none or it is inactive. */
export function accessOf(entry: UserEntry | null | undefined): Access {
  return entry?.active ? entry.role : 'NONE';
}

export interface SelfEditRestrictions {
  roleLocked: boolean;
  activeLocked: boolean;
  canRemove: boolean;
}

/** Admins cannot lock themselves out: on their own entry, role and active are locked and removing is not allowed. */
export function selfEditRestrictions(actorUid: string, entry: Pick<UserEntry, 'uid'>): SelfEditRestrictions {
  const own = actorUid === entry.uid;
  return {roleLocked: own, activeLocked: own, canRemove: !own};
}
