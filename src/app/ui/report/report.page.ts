import {DatePipe} from '@angular/common';
import {ChangeDetectionStrategy, Component, computed, inject, OnInit, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatSelectModule} from '@angular/material/select';
import {Clock} from '../../application/clock';
import {JournalService} from '../../application/journal.service';
import {MasterDataService} from '../../application/master-data.service';
import {ReportService} from '../../application/report.service';
import {OpenEntryNotice} from '../../domain/report';
import {formatHours} from '../shared/datetime';
import {tourTitle} from '../tours/tour-text';

/** Hours worked and rides per person for a calendar year (spec yearly-report). */
@Component({
  selector: 'app-report-page',
  imports: [FormsModule, DatePipe, MatSelectModule, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <div class="page-header">
        <h2>Jahresbericht</h2>
        <mat-form-field class="year">
          <mat-label>Jahr</mat-label>
          <mat-select [ngModel]="year()" (ngModelChange)="select($event)" name="year">
            @for (y of years(); track y) {
              <mat-option [value]="y">{{ y }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <button mat-icon-button (click)="select(year())" aria-label="Neu laden" title="Neu laden"><mat-icon>refresh</mat-icon></button>
      </div>

      @if (reports.dataSince(); as since) {
        <p class="muted since">Daten seit {{ since | date: 'dd.MM.yyyy' }}. Frühere Einsätze sind im Journalblatt nicht erfasst.</p>
      } @else if (!reports.loading()) {
        <p class="muted since">Noch keine Touren erfasst.</p>
      }

      @if (reports.error(); as error) {
        <p class="error-text">{{ error }}</p>
      }

      @if (reports.report(); as report) {
        <div class="table-wrapper">
          <table class="report">
            <thead><tr><th>Person</th><th class="num">Stunden</th><th class="num">Fahrten</th></tr></thead>
            <tbody>
              @for (row of report.rows; track row.personId) {
                <tr [attr.data-person]="row.personId">
                  <td>{{ row.name }} @if (!row.active) { <span class="muted">(inaktiv)</span> }</td>
                  <td class="num">{{ hours(row.hours) }}</td>
                  <td class="num">{{ row.rides }}</td>
                </tr>
              }
            </tbody>
            <tfoot>
              <tr><td>Summe</td><td class="num">{{ hours(totals().hours) }}</td><td class="num">{{ totals().rides }}</td></tr>
            </tfoot>
          </table>
        </div>

        @if (report.openEntries.length) {
          <section class="open">
            <h3>Offene Einträge (nicht gezählt)</h3>
            <p class="muted">
              Bei diesen Einträgen fehlt eine Zeit. Dienste bitte in der Dienstmannschaft austragen oder korrigieren,
              Fahrten von Zusatzfahrzeugen bitte um die Rückkehrzeit ergänzen.
            </p>
            <ul>
              @for (n of report.openEntries; track n.key) {
                @if (n.kind === 'MEMBER') {
                  <li class="member">{{ n.name }} · seit {{ n.from | date: 'dd.MM.yyyy HH:mm' }} · {{ tourLabel(n) }} · Ende fehlt</li>
                } @else {
                  <li class="ride">Fahrt am {{ n.from | date: 'dd.MM.yyyy HH:mm' }} · {{ tourLabel(n) }} · {{ n.name }} · Rückkehrzeit fehlt</li>
                }
              }
            </ul>
          </section>
        }
      } @else if (reports.loading()) {
        <p class="muted">Lade Bericht …</p>
      }
    </div>
  `,
  styles: `
    .year { width: 140px; }
    .since { margin-top: 0; }
    .table-wrapper { overflow-x: auto; }
    table.report { border-collapse: collapse; min-width: 360px; background: #fff; }
    table.report th, table.report td { text-align: left; padding: 6px 12px; border-bottom: 1px solid rgba(0,0,0,.08); }
    table.report .num { text-align: right; font-variant-numeric: tabular-nums; }
    table.report tfoot td { font-weight: 500; border-top: 2px solid rgba(0,0,0,.2); }
    .open { margin-top: 24px; }
    .open h3 { color: #8a5300; }
  `,
})
export class ReportPage implements OnInit {
  protected readonly reports = inject(ReportService);
  private readonly journal = inject(JournalService);
  private readonly md = inject(MasterDataService);
  private readonly clock = inject(Clock);

  protected readonly year = signal(this.clock.now().getFullYear());

  /** Current year back to the first recorded year (at least the last five years). */
  protected readonly years = computed(() => {
    const current = this.clock.now().getFullYear();
    const first = Math.min(this.reports.dataSince()?.getFullYear() ?? current, current - 4);
    return Array.from({length: current - first + 1}, (_, i) => current - i);
  });

  protected readonly totals = computed(() => {
    const rows = this.reports.report()?.rows ?? [];
    return {hours: rows.reduce((s, r) => s + r.hours, 0), rides: rows.reduce((s, r) => s + r.rides, 0)};
  });

  protected hours = formatHours;

  ngOnInit(): void {
    void this.reports.load(this.year());
  }

  protected select(year: number): void {
    this.year.set(year);
    void this.reports.load(year);
  }

  protected tourLabel(notice: OpenEntryNotice): string {
    const tour = this.journal.tourById(notice.tourId);
    return tour ? tourTitle(tour, this.md) : 'Tour';
  }
}
