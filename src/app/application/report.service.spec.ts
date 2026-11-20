import {TestBed} from '@angular/core/testing';
import {endTour} from '../domain/tour';
import {dayTour, t} from '../domain/testing/fixtures';
import {ReportService} from './report.service';
import {fakeProviders} from './testing/fakes';

describe('ReportService', () => {
  let fx: ReturnType<typeof fakeProviders>;
  let service: ReportService;

  beforeEach(() => {
    fx = fakeProviders(t(12));
    fx.masterData.persons = ['huber', 'maier', 'beer'].map(n => ({number: n, name: n, active: true}));
    TestBed.configureTestingModule({providers: fx.providers});
    service = TestBed.inject(ReportService);
  });

  it('computes the report for the selected year', async () => {
    await fx.tours.save(endTour(dayTour(), t(18)));
    await fx.rides.save({tourId: 'day', vehicleId: '44.201', alarmAt: t(9), crew: [{personId: 'huber', role: 'DRIVER'}], type: 'RD'});

    await service.load(2027);
    const report = service.report()!;
    expect(report.year).toBe(2027);
    expect(report.rows.find(r => r.personId === 'huber')).toEqual(jasmine.objectContaining({hours: 12, rides: 1}));
    expect(service.loading()).toBeFalse();
  });

  it('reports the date since which data exists', async () => {
    await fx.tours.save({...dayTour(), id: 'later'});
    await fx.tours.save({...dayTour(), id: 'first', members: [{id: 'a', personId: 'huber', role: 'DRIVER', from: t(6, 0, -30), to: t(7, 0, -30)}]});
    await service.load(2027);
    expect(service.dataSince()).toEqual(t(6, 0, -30));
  });

  it('has no data-since date without tours', async () => {
    await service.load(2027);
    expect(service.dataSince()).toBeUndefined();
    expect(service.report()!.rows.length).toBe(3);
  });

  it('shows an error when loading fails', async () => {
    spyOn(fx.rides, 'loadBetween').and.rejectWith(new Error('offline'));
    spyOn(console, 'error');
    await service.load(2027);
    expect(service.error()).toBe('Der Bericht konnte nicht geladen werden.');
    expect(service.report()).toBeUndefined();
  });
});
