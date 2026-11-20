import {inject, Injectable, signal} from '@angular/core';
import {YearReport, yearBounds, yearReport} from '../domain/report';
import {MasterDataRepository, RideRepository, TourRepository} from './ports';

/** Yearly per-person statistics (spec yearly-report). Uses one-time reads, no listeners. */
@Injectable({providedIn: 'root'})
export class ReportService {
  private readonly tours = inject(TourRepository);
  private readonly rides = inject(RideRepository);
  private readonly masterData = inject(MasterDataRepository);

  readonly report = signal<YearReport | undefined>(undefined);
  /** Start of the first tour ever recorded: statistics exist only since then. */
  readonly dataSince = signal<Date | undefined>(undefined);
  readonly loading = signal(false);
  readonly error = signal<string | undefined>(undefined);

  async load(year: number): Promise<void> {
    this.loading.set(true);
    this.error.set(undefined);
    try {
      const {start, end} = yearBounds(year);
      const [tours, rides, persons, first] = await Promise.all([
        this.tours.loadForPeriod(start, end),
        this.rides.loadBetween(start, end),
        this.masterData.loadPersons(),
        this.tours.firstTourStart(),
      ]);
      this.report.set(yearReport(year, tours, rides, persons));
      this.dataSince.set(first);
    } catch (err) {
      console.error('Bericht konnte nicht geladen werden', err);
      this.error.set('Der Bericht konnte nicht geladen werden.');
      this.report.set(undefined);
    } finally {
      this.loading.set(false);
    }
  }
}
