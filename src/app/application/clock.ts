import {DestroyRef, inject, Injectable, Signal, signal} from '@angular/core';

/** How many hours back ended tours and rides are shown in the daily view. */
export const DISPLAY_HOURS = 20;
export const HOUR_MS = 3_600_000;

/** Current time as a signal, refreshed every minute. Replace with a fixed signal in tests. */
@Injectable({providedIn: 'root'})
export class Clock {
  private readonly current = signal(new Date());
  readonly now: Signal<Date> = this.current.asReadonly();

  constructor() {
    const handle = setInterval(() => this.current.set(new Date()), 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(handle));
  }
}
