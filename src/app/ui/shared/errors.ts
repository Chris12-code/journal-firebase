import {ValidationError} from '../../domain/model';

/** Message for errors thrown by the backend (network, permissions). */
export function backendErrorMessage(err: unknown): string {
  const code = (err as {code?: string})?.code ?? '';
  if (code.includes('permission-denied')) return 'Keine Berechtigung. Bitte neu anmelden.';
  if (code.includes('unavailable')) return 'Keine Verbindung zum Server. Bitte später erneut versuchen.';
  return 'Speichern fehlgeschlagen.';
}

export function joinErrors(errors: ValidationError[]): string {
  return [...new Set(errors.map(e => e.message))].join(' ');
}
