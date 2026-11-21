import {CdkConnectedOverlay, CdkOverlayOrigin, ConnectedPosition} from '@angular/cdk/overlay';
import {ChangeDetectionStrategy, Component, computed, effect, ElementRef, input, model, signal, untracked, viewChild} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {atTimeOfDay, formatDateTime, nowMinute, parseDateTime} from './datetime';

interface TimeOption {
  hours: number;
  minutes: number;
  label: string;
}

/** Minutes between two entries of the time list. */
const TIME_STEP = 5;

/** 00:00 … 23:55 in 5-minute steps. */
const TIME_OPTIONS: TimeOption[] = Array.from({length: (24 * 60) / TIME_STEP}, (_, i) => {
  const hours = Math.floor((i * TIME_STEP) / 60);
  const minutes = (i * TIME_STEP) % 60;
  return {hours, minutes, label: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`};
});

const TIME_ROW_PX = 32;

/**
 * One field for a point in time: type "21.11.2026 14:05" (or just "14:05" / "21.11."), or pick it in a
 * popup with calendar and time list. With a `reference` (start of the range), a time typed alone into an
 * empty field lands on the reference's day, or the next day when it would not be after the reference.
 * The value is `undefined` while the text is empty or invalid.
 */
@Component({
  selector: 'app-datetime-field',
  imports: [CdkConnectedOverlay, CdkOverlayOrigin, MatButtonModule, MatDatepickerModule, MatIconModule, MatInputModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="datetime" cdkOverlayOrigin #origin="cdkOverlayOrigin">
      <mat-form-field class="field">
        <mat-label>{{ label() }}</mat-label>
        <input
          matInput
          #textInput
          [value]="text()"
          (input)="typed(textInput.value)"
          (focus)="focused()"
          (blur)="blurred()"
          (keydown.arrowdown)="openPanel($event)"
          placeholder="TT.MM.JJJJ HH:MM"
          autocomplete="off"
        >
        <button mat-icon-button matIconSuffix type="button" (click)="toggle()" [attr.aria-label]="label() + ' auswählen'" [attr.aria-expanded]="open()">
          <mat-icon>event</mat-icon>
        </button>
        @if (invalid()) {
          <mat-hint class="invalid">Ungültig – z. B. 21.11.2026 14:05 oder nur 14:05</mat-hint>
        }
      </mat-form-field>
      <button mat-icon-button type="button" (click)="setNow()" [attr.aria-label]="label() + ' jetzt'" title="Jetzt">
        <mat-icon>schedule</mat-icon>
      </button>
    </div>

    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="origin"
      [cdkConnectedOverlayOpen]="open()"
      [cdkConnectedOverlayPositions]="positions"
      [cdkConnectedOverlayHasBackdrop]="true"
      cdkConnectedOverlayBackdropClass="cdk-overlay-transparent-backdrop"
      (backdropClick)="close()"
      (detach)="close()"
      (overlayKeydown)="panelKeydown($event)"
      (attach)="scrollToTime()"
    >
      <div class="datetime-panel" role="group" [attr.aria-label]="label() + ' auswählen'">
        <mat-calendar [selected]="value() ?? null" [startAt]="calendarStart()" (selectedChange)="pickDate($event)" />
        <div class="times" #times role="listbox" [attr.aria-label]="label() + ' Uhrzeit'">
          @for (t of timeOptions; track t.label) {
            <button
              type="button"
              class="time"
              role="option"
              [class.hour]="t.minutes === 0"
              [class.selected]="isSelected(t)"
              [attr.aria-selected]="isSelected(t)"
              (click)="pickTime(t)"
            >{{ t.label }}</button>
          }
        </div>
      </div>
    </ng-template>
  `,
  styles: `
    :host { display: block; }
    .datetime { display: flex; gap: 8px; align-items: flex-start; }
    .field { flex: 1 1 auto; min-width: 0; }
    .datetime > button { margin-top: 4px; }
    .invalid { color: #b00020; }
    .datetime-panel {
      display: flex; background: #fff; border-radius: 8px; overflow: hidden;
      box-shadow: 0 5px 5px -3px rgba(0,0,0,.2), 0 8px 10px 1px rgba(0,0,0,.14), 0 3px 14px 2px rgba(0,0,0,.12);
    }
    .datetime-panel mat-calendar { width: 296px; }
    .times { width: 88px; height: 340px; overflow-y: auto; border-left: 1px solid rgba(0,0,0,.12); padding: 4px 0; }
    .time {
      display: block; width: 100%; height: 32px; border: 0; background: none; cursor: pointer;
      font: inherit; font-size: 14px;
    }
    .time:hover { background: rgba(0,0,0,.06); }
    .time.hour { font-weight: 500; }
    .time.selected { background: rgba(103,58,183,.16); font-weight: 500; }
    @media (max-width: 420px) {
      .datetime-panel { flex-direction: column; }
      .times { width: 296px; height: 140px; border-left: 0; border-top: 1px solid rgba(0,0,0,.12); }
    }
  `,
})
export class DateTimeFieldComponent {
  readonly label = input.required<string>();
  /** Start of the range this field ends; completes a time typed alone (e.g. 06:00 after a 19:00 start = next day). */
  readonly reference = input<Date | undefined>(undefined);
  readonly value = model<Date | undefined>(undefined);

  protected readonly timeOptions = TIME_OPTIONS;
  protected readonly positions: ConnectedPosition[] = [
    {originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetY: 4},
    {originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetY: -4},
  ];

  protected readonly text = signal('');
  protected readonly invalid = signal(false);
  protected readonly open = signal(false);
  protected readonly calendarStart = computed(() => this.value() ?? this.reference() ?? nowMinute());

  private readonly times = viewChild<ElementRef<HTMLElement>>('times');
  /** Value when typing started; a partial entry keeps its date or time. */
  private base: Date | undefined;
  /** Last value emitted by this component; any other value comes from outside and replaces the text. */
  private emitted: Date | undefined | null = null;
  private parseFailed = false;

  constructor() {
    effect(() => {
      const v = this.value();
      untracked(() => {
        if (v === this.emitted) return;
        this.show(v);
        this.base = v;
      });
    });
  }

  protected focused(): void {
    this.base = this.value();
  }

  protected typed(text: string): void {
    this.text.set(text);
    const parsed = parseDateTime(text, {base: this.base, reference: this.reference(), now: nowMinute()});
    this.parseFailed = parsed === null;
    // Complain only once the user leaves the field, not while a partial entry is typed.
    if (!this.parseFailed) this.invalid.set(false);
    this.emit(parsed ?? undefined);
  }

  protected blurred(): void {
    // Show the completed value ("06:00" -> "22.11.2026 06:00") once the user leaves the field.
    const v = this.value();
    this.invalid.set(this.parseFailed);
    if (v && !this.parseFailed) this.text.set(formatDateTime(v));
    this.base = v;
  }

  protected toggle(): void {
    this.open.update(o => !o);
  }

  protected openPanel(event: Event): void {
    event.preventDefault();
    this.open.set(true);
  }

  protected close(): void {
    this.open.set(false);
  }

  protected panelKeydown(event: KeyboardEvent): void {
    // Only the panel closes; the dialog behind it stays open.
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.close();
    }
  }

  protected pickDate(day: Date | null): void {
    if (!day) return;
    const from = this.value() ?? nowMinute();
    this.set(new Date(day.getFullYear(), day.getMonth(), day.getDate(), from.getHours(), from.getMinutes()));
  }

  protected pickTime(option: TimeOption): void {
    this.set(atTimeOfDay(option.hours, option.minutes, {base: this.value(), reference: this.reference(), now: nowMinute()}));
    this.close();
  }

  protected setNow(): void {
    this.set(nowMinute());
  }

  protected isSelected(option: TimeOption): boolean {
    const v = this.value();
    return !!v && v.getHours() === option.hours && v.getMinutes() === option.minutes;
  }

  /** Scrolls the time list so the current (or nearest earlier) time is near the top. */
  protected scrollToTime(): void {
    requestAnimationFrame(() => {
      const list = this.times()?.nativeElement;
      if (!list) return;
      const t = this.value() ?? this.reference() ?? nowMinute();
      const index = (t.getHours() * 60 + t.getMinutes() - (t.getMinutes() % TIME_STEP)) / TIME_STEP;
      list.scrollTop = Math.max(0, (index - 2) * TIME_ROW_PX);
    });
  }

  private set(value: Date): void {
    this.emit(value);
    this.show(value);
    this.base = value;
  }

  private show(value: Date | undefined): void {
    this.text.set(value ? formatDateTime(value) : '');
    this.parseFailed = false;
    this.invalid.set(false);
  }

  private emit(value: Date | undefined): void {
    this.emitted = value;
    this.value.set(value);
  }
}
