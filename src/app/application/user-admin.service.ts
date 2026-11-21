import {computed, inject, Injectable} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {catchError, distinctUntilChanged, map, of, switchMap} from 'rxjs';
import {selfEditRestrictions, UserEntry} from '../domain/user';
import {NewUser, UserChanges, UserRepository} from './ports';
import {SessionService} from './session.service';

/** German message for a failed user maintenance action. */
export function userErrorMessage(e: unknown): string {
  const code = (e as {code?: string})?.code ?? '';
  if (code.includes('email-already-in-use')) return 'Diese E-Mail-Adresse wird bereits verwendet.';
  if (code.includes('weak-password')) return 'Das Passwort ist zu schwach (mindestens 6 Zeichen).';
  if (code.includes('invalid-email')) return 'Die E-Mail-Adresse ist ungültig.';
  if (code.includes('user-not-found')) return 'Zu dieser E-Mail-Adresse gibt es kein Login.';
  if (code.includes('permission-denied')) return 'Keine Berechtigung für diese Änderung.';
  return 'Die Aktion ist fehlgeschlagen.';
}

const byName = (a: UserEntry, b: UserEntry) => a.name.localeCompare(b.name, 'de');

/**
 * User maintenance for admins (spec journal-access, design D3).
 * Every action resolves to an error message for the user, or null on success.
 */
@Injectable({providedIn: 'root'})
export class UserAdminService {
  private readonly repo = inject(UserRepository);
  private readonly session = inject(SessionService);

  /** All user entries sorted by name; only loaded while an admin is logged in. */
  readonly users = toSignal(
    this.session.access$.pipe(
      map(a => a === 'ADMIN'),
      distinctUntilChanged(),
      switchMap(isAdmin => (isAdmin ? this.repo.list$() : of([] as UserEntry[]))),
      map(list => [...list].sort(byName)),
      catchError(err => {
        console.error('Benutzer konnten nicht geladen werden', err);
        return of([] as UserEntry[]);
      }),
    ),
    {initialValue: [] as UserEntry[]},
  );

  private readonly actorUid = computed(() => this.session.user()?.uid ?? '');

  /** Locked fields on the given entry for the logged-in admin. */
  restrictions(entry: Pick<UserEntry, 'uid'>) {
    return selfEditRestrictions(this.actorUid(), entry);
  }

  async add(user: NewUser): Promise<string | null> {
    if (!user.email.trim() || !user.name.trim()) return 'E-Mail und Name sind erforderlich.';
    return this.run(() => this.repo.create(user));
  }

  async change(entry: UserEntry, changes: UserChanges): Promise<string | null> {
    if (!changes.name.trim()) return 'Der Name ist erforderlich.';
    const r = this.restrictions(entry);
    if ((r.roleLocked && changes.role !== entry.role) || (r.activeLocked && changes.active !== entry.active)) {
      return 'Die eigene Rolle und den eigenen Status kann man nicht ändern.';
    }
    return this.run(() => this.repo.update(entry.uid, changes));
  }

  async remove(entry: UserEntry): Promise<string | null> {
    if (!this.restrictions(entry).canRemove) return 'Den eigenen Benutzer kann man nicht entfernen.';
    return this.run(() => this.repo.remove(entry.uid));
  }

  async sendPasswordReset(entry: UserEntry): Promise<string | null> {
    return this.run(() => this.session.sendPasswordReset(entry.email));
  }

  private async run(action: () => Promise<unknown>): Promise<string | null> {
    try {
      await action();
      return null;
    } catch (e) {
      return userErrorMessage(e);
    }
  }
}
