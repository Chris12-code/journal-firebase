import {computed, inject, Injectable} from '@angular/core';
import {toSignal} from '@angular/core/rxjs-interop';
import {firstValueFrom} from 'rxjs';
import {AuthGateway, SessionUser} from './ports';

/** Login state (spec journal-access). Other services start/stop their listeners from `user$`. */
@Injectable({providedIn: 'root'})
export class SessionService {
  private readonly gateway = inject(AuthGateway);

  readonly user$ = this.gateway.user$;
  /** `undefined` while the login state is still unknown, `null` when logged out. */
  readonly user = toSignal<SessionUser | null | undefined>(this.user$, {initialValue: undefined});
  readonly isLoggedIn = computed(() => !!this.user());

  /** Resolves once the login state is known. */
  currentUser(): Promise<SessionUser | null> {
    return firstValueFrom(this.user$);
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
}
