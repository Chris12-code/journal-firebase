import {ChangeDetectionStrategy, Component, computed, inject} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatCardModule} from '@angular/material/card';
import {MatDialog} from '@angular/material/dialog';
import {MatIconModule} from '@angular/material/icon';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Clock} from '../../application/clock';
import {JournalService} from '../../application/journal.service';
import {MasterDataService} from '../../application/master-data.service';
import {CrewMember, ROLE_LABELS, Shift, SHIFT_LABELS, Tour} from '../../domain/model';
import {PlannedSlot, SlotStatus} from '../../domain/shift-plan';
import {isActive, tourEnd} from '../../domain/tour';
import {RideDialogComponent, RideDialogData} from '../rides/ride-dialog.component';
import {confirmAction} from '../shared/confirm-dialog.component';
import {formatTime} from '../shared/datetime';
import {openForm} from '../shared/dialogs';
import {backendErrorMessage, joinErrors} from '../shared/errors';
import {CrewChangeData, CrewChangeDialogComponent, CrewChangeMode} from './crew-change-dialog.component';
import {TourDialogComponent, TourDialogData} from './tour-dialog.component';
import {describeWarnings, sortedMembers, tourTitle} from './tour-text';

/** Active tours and tours ended within the display window, grouped by shift (spec tours). */
@Component({
  selector: 'app-tours-page',
  imports: [MatCardModule, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-header">
        <h2>Dienstmannschaft</h2>
        <button mat-stroked-button (click)="startExtra()"><mat-icon>add_road</mat-icon> Zusatzfahrzeug</button>
        <button mat-flat-button (click)="startTour()"><mat-icon>add</mat-icon> Tour beginnen</button>
      </div>

      <section class="plan">
        <h3>Geplante Dienste</h3>
        <table class="slots">
          <tbody>
            @for (v of journal.plannedSlots(); track v.slot.key) {
              <tr [attr.data-slot]="v.slot.key" [class]="'status-' + v.status">
                <td class="when">{{ slotDay(v.slot) }} · {{ shiftLabels[v.slot.shift] }}</td>
                <td class="what">{{ v.slot.vehicleType }} {{ v.slot.vehicleId }}</td>
                <td class="times">{{ slotTimes(v.slot) }}</td>
                <td class="state">
                  <span class="status">{{ statusLabels[v.status] }}</span>
                  @if (v.tour) { <span class="muted"> · {{ crewNames(v.tour) }}</span> }
                  @if (v.slot.note) { <div class="note muted">{{ v.slot.note }}</div> }
                </td>
                <td class="row-actions">
                  @if (v.status !== 'OCCUPIED') {
                    <button mat-button (click)="occupy(v.slot)" [attr.aria-label]="'Besetzen ' + v.slot.key">Besetzen</button>
                  }
                </td>
              </tr>
            } @empty {
              <tr><td class="muted">Keine geplanten Dienste in den nächsten Stunden.</td></tr>
            }
          </tbody>
        </table>
      </section>

      @for (group of groups(); track group.shift) {
        <h3>{{ shiftLabels[group.shift] }}</h3>
        @for (tour of group.tours; track tour.id) {
          <mat-card class="tour" [attr.data-tour-id]="tour.id">
            <mat-card-header>
              <mat-card-title>{{ title(tour) }}</mat-card-title>
              <mat-card-subtitle>
                @if (active(tour)) { <span class="status active">aktiv</span> }
                @else { <span class="status">beendet {{ time(end(tour)) }}</span> }
              </mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <table class="crew">
                <thead><tr><th>Rolle</th><th>Person</th><th>Von</th><th>Bis</th><th></th></tr></thead>
                <tbody>
                  @for (m of members(tour); track m.id) {
                    <tr [class.ended]="!!m.to">
                      <td>{{ roleLabels[m.role] }}</td>
                      <td>{{ md.personName(m.personId) }}</td>
                      <td>{{ time(m.from) }}</td>
                      <td>{{ time(m.to) }}</td>
                      <td class="row-actions">
                        @if (!m.to) {
                          <button mat-icon-button (click)="change('replace', tour, m)" [attr.aria-label]="'Ersetzen ' + md.personName(m.personId)" title="Ersetzen">
                            <mat-icon>swap_horiz</mat-icon>
                          </button>
                          <button mat-icon-button (click)="change('end', tour, m)" [attr.aria-label]="'Austragen ' + md.personName(m.personId)" title="Austragen">
                            <mat-icon>logout</mat-icon>
                          </button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
              @for (w of warnings(tour); track w) {
                <p class="warning-text">{{ w }}</p>
              }
            </mat-card-content>
            <mat-card-actions>
              @if (active(tour)) {
                <button mat-flat-button (click)="logRide(tour)"><mat-icon>add</mat-icon> Fahrt erfassen</button>
                <button mat-button (click)="change('add', tour)"><mat-icon>person_add</mat-icon> Mitglied hinzufügen</button>
                @if (activeCount(tour) >= 2) {
                  <button mat-button (click)="change('swap', tour)"><mat-icon>sync_alt</mat-icon> Rollen tauschen</button>
                }
                <button mat-button (click)="change('endTour', tour)"><mat-icon>flag</mat-icon> Tour beenden</button>
              }
              <button mat-button (click)="correct(tour)"><mat-icon>edit</mat-icon> Korrigieren</button>
              <button mat-button (click)="remove(tour)"><mat-icon>delete</mat-icon> Löschen</button>
            </mat-card-actions>
          </mat-card>
        } @empty {
          <p class="muted">Keine aktuellen Touren.</p>
        }
      }
    </div>
  `,
  styles: `
    .tour { margin-bottom: 16px; }
    .plan { margin-bottom: 24px; }
    table.slots { width: 100%; border-collapse: collapse; background: #fff; }
    table.slots td { padding: 6px 8px; border-bottom: 1px solid rgba(0,0,0,.08); vertical-align: top; }
    table.slots .when { white-space: nowrap; }
    table.slots .status { font-weight: 500; }
    tr.status-OCCUPIED .status { color: #1b5e20; }
    tr.status-UNOCCUPIED .status { color: #b00020; }
    tr.status-UPCOMING .status { color: rgba(0,0,0,.6); }
    .note { font-size: 12px; }
    .status { font-weight: 500; }
    .status.active { color: #1b5e20; }
    table.crew { width: 100%; border-collapse: collapse; margin-top: 8px; }
    table.crew th, table.crew td { text-align: left; padding: 4px 8px; border-bottom: 1px solid rgba(0,0,0,.08); }
    table.crew tr.ended td { color: rgba(0,0,0,.5); }
    .row-actions { white-space: nowrap; text-align: right; }
    mat-card-actions { flex-wrap: wrap; gap: 4px; }
  `,
})
export class ToursPage {
  protected readonly journal = inject(JournalService);
  protected readonly md = inject(MasterDataService);
  private readonly clock = inject(Clock);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  protected readonly shiftLabels = SHIFT_LABELS;
  protected readonly roleLabels = ROLE_LABELS;

  protected readonly statusLabels: Record<SlotStatus, string> = {
    OCCUPIED: 'besetzt',
    UPCOMING: 'geplant',
    UNOCCUPIED: 'nicht besetzt',
  };

  protected readonly groups = computed(() =>
    (['DAY', 'NIGHT'] as Shift[]).map(shift => ({shift, tours: this.journal.currentTours().filter(t => t.shift === shift)})),
  );

  protected title = (tour: Tour) => tourTitle(tour, this.md);
  protected members = sortedMembers;
  protected active = isActive;
  protected end = tourEnd;
  protected activeCount = (tour: Tour) => tour.members.filter(m => !m.to).length;
  protected time = (d: Date | undefined) => formatTime(d, this.clock.now());

  protected warnings(tour: Tour): string[] {
    return describeWarnings(this.journal.warningsFor(tour), this.journal.tours(), this.md);
  }

  /** "Heute" / "Morgen" / "Gestern" / "Mi 03.03." for the service date of a slot. */
  protected slotDay(slot: PlannedSlot): string {
    const today = this.clock.now();
    const day = new Date(slot.start.getFullYear(), slot.start.getMonth(), slot.start.getDate());
    const diff = Math.round((day.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86_400_000);
    if (diff === 0) return 'Heute';
    if (diff === 1) return 'Morgen';
    if (diff === -1) return 'Gestern';
    return day.toLocaleDateString('de-AT', {weekday: 'short', day: '2-digit', month: '2-digit'});
  }

  protected slotTimes(slot: PlannedSlot): string {
    return `${formatTime(slot.start, slot.start)}–${formatTime(slot.end, slot.start)}`;
  }

  protected crewNames(tour: Tour): string {
    return tour.members.filter(m => !m.to).map(m => this.md.personName(m.personId)).join(', ') || 'beendet';
  }

  private openTour(data: TourDialogData, width = '600px'): void {
    openForm<TourDialogComponent, TourDialogData>(this.dialog, this.snack, TourDialogComponent, {data, width});
  }

  protected occupy(slot: PlannedSlot): void {
    this.openTour({kind: 'SHIFT', slot});
  }

  protected startExtra(): void {
    this.openTour({kind: 'EXTRA'});
  }

  protected startTour(): void {
    this.openTour({});
  }

  protected correct(tour: Tour): void {
    this.openTour({tour}, '680px');
  }

  protected logRide(tour: Tour): void {
    openForm<RideDialogComponent, RideDialogData>(this.dialog, this.snack, RideDialogComponent, {data: {tourId: tour.id}, width: '640px'});
  }

  protected change(mode: CrewChangeMode, tour: Tour, member?: CrewMember): void {
    openForm<CrewChangeDialogComponent, CrewChangeData>(this.dialog, this.snack, CrewChangeDialogComponent, {
      data: {mode, tour, memberId: member?.id},
      width: '520px',
    });
  }

  protected async remove(tour: Tour): Promise<void> {
    const confirmed = await confirmAction(this.dialog, {
      title: 'Tour löschen?',
      message: `Tour „${this.title(tour)}“ wirklich löschen?`,
      confirmLabel: 'Löschen',
    });
    if (!confirmed) return;
    try {
      const result = await this.journal.deleteTour(tour);
      if (!result.ok) this.snack.open(joinErrors(result.errors), 'OK', {duration: 8000});
    } catch (err) {
      this.snack.open(backendErrorMessage(err), 'OK', {duration: 8000});
    }
  }
}
