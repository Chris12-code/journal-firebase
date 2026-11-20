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
import {isActive, tourEnd} from '../../domain/tour';
import {formatTime} from '../shared/datetime';
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
        <button mat-flat-button (click)="startTour()"><mat-icon>add</mat-icon> Tour beginnen</button>
      </div>

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
          <p class="muted">Keine Touren.</p>
        }
      }
    </div>
  `,
  styles: `
    .tour { margin-bottom: 16px; }
    .status { font-weight: 500; }
    .status.active { color: #1b5e20; }
    table.crew { width: 100%; border-collapse: collapse; margin-top: 8px; }
    table.crew th, table.crew td { text-align: left; padding: 4px 8px; border-bottom: 1px solid rgba(0,0,0,.08); }
    table.crew tr.ended td { color: rgba(0,0,0,.5); }
    .row-actions { white-space: nowrap; text-align: right; }
    mat-card-actions { flex-wrap: wrap; }
  `,
})
export class ToursPage {
  private readonly journal = inject(JournalService);
  protected readonly md = inject(MasterDataService);
  private readonly clock = inject(Clock);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  protected readonly shiftLabels = SHIFT_LABELS;
  protected readonly roleLabels = ROLE_LABELS;

  protected readonly groups = computed(() =>
    (['DAY', 'NIGHT'] as Shift[]).map(shift => ({shift, tours: this.journal.tours().filter(t => t.shift === shift)})),
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

  protected startTour(): void {
    this.dialog.open<TourDialogComponent, TourDialogData>(TourDialogComponent, {data: {}, width: '560px', maxWidth: '95vw'});
  }

  protected correct(tour: Tour): void {
    this.dialog.open<TourDialogComponent, TourDialogData>(TourDialogComponent, {data: {tour}, width: '640px', maxWidth: '95vw'});
  }

  protected change(mode: CrewChangeMode, tour: Tour, member?: CrewMember): void {
    this.dialog.open<CrewChangeDialogComponent, CrewChangeData>(CrewChangeDialogComponent, {
      data: {mode, tour, memberId: member?.id},
      width: '480px',
      maxWidth: '95vw',
    });
  }

  protected async remove(tour: Tour): Promise<void> {
    if (!confirm(`Tour „${this.title(tour)}“ wirklich löschen?`)) return;
    try {
      const result = await this.journal.deleteTour(tour);
      if (!result.ok) this.snack.open(joinErrors(result.errors), 'OK', {duration: 8000});
    } catch (err) {
      this.snack.open(backendErrorMessage(err), 'OK', {duration: 8000});
    }
  }
}
