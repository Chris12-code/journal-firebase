import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {MatButtonModule} from '@angular/material/button';
import {MatDialog} from '@angular/material/dialog';
import {MatIconModule} from '@angular/material/icon';
import {MatSnackBar} from '@angular/material/snack-bar';
import {Clock} from '../../application/clock';
import {JournalService} from '../../application/journal.service';
import {MasterDataService} from '../../application/master-data.service';
import {Ride} from '../../domain/model';
import {formatTime} from '../shared/datetime';
import {backendErrorMessage} from '../shared/errors';
import {RideDialogComponent, RideDialogData} from './ride-dialog.component';

/** Rides alarmed within the display window, newest first (spec rides). */
@Component({
  selector: 'app-rides-page',
  imports: [MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-header">
        <h2>Fahrten</h2>
        <button mat-flat-button (click)="open()"><mat-icon>add</mat-icon> Neue Fahrt</button>
      </div>

      @if (journal.rides().length === 0) {
        <p class="muted">Keine Fahrten in den letzten Stunden.</p>
      } @else {
        <div class="table-wrapper">
          <table class="rides">
            <thead>
              <tr>
                <th>Alarm</th><th>Zurück</th><th>Fahrzeug</th><th>Art</th><th>Kategorie</th><th>Patient</th>
                <th>Einsatzort</th><th>Zielort</th><th>Besatzung</th><th></th>
              </tr>
            </thead>
            <tbody>
              @for (ride of journal.rides(); track ride.id) {
                <tr>
                  <td>{{ time(ride.alarmAt) }}</td>
                  <td>{{ time(ride.returnedAt) || '–' }}</td>
                  <td>{{ md.vehicleLabel(ride.vehicleId) }}</td>
                  <td>{{ ride.type }}</td>
                  <td>{{ ride.category ?? '' }}</td>
                  <td>{{ ride.patient ?? '' }}</td>
                  <td>{{ ride.pickup ?? '' }}</td>
                  <td>{{ ride.destination ?? '' }}</td>
                  <td>{{ crew(ride) }}</td>
                  <td class="row-actions">
                    <button mat-icon-button (click)="open(ride)" aria-label="Bearbeiten" title="Bearbeiten"><mat-icon>edit</mat-icon></button>
                    <button mat-icon-button (click)="remove(ride)" aria-label="Löschen" title="Löschen"><mat-icon>delete</mat-icon></button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  `,
  styles: `
    .table-wrapper { overflow-x: auto; }
    table.rides { width: 100%; border-collapse: collapse; background: #fff; }
    table.rides th, table.rides td { text-align: left; padding: 6px 8px; border-bottom: 1px solid rgba(0,0,0,.08); white-space: nowrap; }
    table.rides td:nth-child(9) { white-space: normal; min-width: 160px; }
    .row-actions { text-align: right; }
  `,
})
export class RidesPage {
  protected readonly journal = inject(JournalService);
  protected readonly md = inject(MasterDataService);
  private readonly clock = inject(Clock);
  private readonly dialog = inject(MatDialog);
  private readonly snack = inject(MatSnackBar);

  protected time = (d: Date | undefined) => formatTime(d, this.clock.now());

  protected crew(ride: Ride): string {
    return ride.crew.map(c => this.md.personName(c.personId)).join(', ');
  }

  protected open(ride?: Ride): void {
    this.dialog.open<RideDialogComponent, RideDialogData>(RideDialogComponent, {
      data: {ride},
      width: '640px',
      maxWidth: '95vw',
    });
  }

  protected async remove(ride: Ride): Promise<void> {
    if (!confirm('Fahrt wirklich löschen?')) return;
    try {
      await this.journal.deleteRide(ride);
    } catch (err) {
      this.snack.open(backendErrorMessage(err), 'OK', {duration: 8000});
    }
  }
}
