import {computed, inject, Injectable} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {distinctUntilChanged, first, firstValueFrom, map, Observable, of, shareReplay, switchMap} from 'rxjs';
import {Access, accessOf, UserEntry} from '../domain/user';
import {AuthGateway, SessionUser} from './ports';

/**
 * Login state and access (spec journal-access, design D3).
 * Other services start/stop their listeners from `member$`, which only emits a user with an active entry.
 */
@Injectable({providedIn: 'root'})
export class SessionService {
  private readonly gateway = inject(AuthGateway);

  readonly user$ = this.gateway.user$;
  /** `undefined` while the login state is still unknown, `null` when logged out. */
  readonly user = toSignal<SessionUser | null | undefined>(this.user$, {initialValue: undefined});
  readonly isLoggedIn = computed(() => !!this.user());

  /** Login and own user entry, from a single live listener on the entry. */
  private readonly state$: Observable<{user: SessionUser | null; entry: UserEntry | null}> = this.user$.pipe(
    switchMap(user => (user ? this.gateway.access$(user.uid).pipe(map(entry => ({user, entry}))) : of({user, entry: null}))),
    shareReplay({bufferSize: 1, refCount: true}),
  );

  /** Own user entry: null when logged out or without entry. */
  readonly entry$: Observable<UserEntry | null> = this.state$.pipe(map(s => s.entry));

  /** `null` when logged out, otherwise what the account may do. */
  readonly access$: Observable<Access | null> = this.state$.pipe(
    map(s => (s.user ? accessOf(s.entry) : null)),
    distinctUntilChanged(),
  );

  /** The logged-in user while it has access (STATION or ADMIN), else null. */
  readonly member$: Observable<SessionUser | null> = this.state$.pipe(
    map(s => (s.user && accessOf(s.entry) !== 'NONE' ? s.user : null)),
    distinctUntilChanged((a, b) => a?.uid === b?.uid),
  );

  /** `undefined` while unknown, `null` when logged out. */
  readonly access = toSignal<Access | null | undefined>(this.access$, {initialValue: undefined});
  readonly entry = toSignal<UserEntry | null>(this.entry$, {initialValue: null});
  readonly isAdmin = computed(() => this.access() === 'ADMIN');

  /** Resolves once the login state is known. */
  currentUser(): Promise<SessionUser | null> {
    return firstValueFrom(this.user$);
  }

  /**
   * Resolves once the access of the current login state is known (`null` when logged out).
   * Waits for the entry of the current user, so a value replayed from the previous login state is never used.
   */
  currentAccess(): Promise<Access | null> {
    return firstValueFrom(
      this.user$.pipe(
        switchMap(u => this.state$.pipe(first(s => (s.user?.uid ?? null) === (u?.uid ?? null)))),
        map(s => (s.user ? accessOf(s.entry) : null)),
      ),
    );
  }

  /** Logs in; resolves to an error message for the user, or null on success. */
  async login(email: string, password: string): Promise<string | null> {
    try {
      await this.gateway.login(email, password);
      return null;
    } catch (e) {
      const code = (e as {code?: string}).code ?? '';
      if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
        return 'E-Mail oder Passwort ist falsch.';
      }
      if (code.includes('too-many-requests')) return 'Zu viele Versuche. Bitte später erneut probieren.';
      if (code.includes('invalid-email')) return 'Die E-Mail-Adresse ist ungültig.';
      return 'Anmeldung fehlgeschlagen.';
    }
  }

  logout(): Promise<void> {
    return this.gateway.logout();
  }

  sendPasswordReset(email: string): Promise<void> {
    return this.gateway.sendPasswordReset(email);
  }
}
