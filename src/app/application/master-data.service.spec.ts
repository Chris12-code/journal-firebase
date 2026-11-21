import {TestBed} from '@angular/core/testing';
import {t} from '../domain/testing/fixtures';
import {MasterDataService} from './master-data.service';
import {fakeProviders} from './testing/fakes';

const flush = () => new Promise(r => setTimeout(r));

describe('MasterDataService', () => {
  let fx: ReturnType<typeof fakeProviders>;
  let service: MasterDataService;

  beforeEach(() => {
    fx = fakeProviders(t(12));
    fx.masterData.persons = [
      {number: '2', name: 'Zeller', active: true},
      {number: '1', name: 'Aigner', active: true},
      {number: '9', name: 'Former', active: false},
    ];
    fx.masterData.vehicles = [
      {number: '80.103', type: 'KTW', active: true},
      {number: '44.201', type: 'RTW', active: true},
      {number: '11.111', type: 'BTW', active: false},
    ];
    TestBed.configureTestingModule({providers: fx.providers});
    service = TestBed.inject(MasterDataService);
  });

  it('loads nothing while logged out', async () => {
    await flush();
    expect(service.persons()).toEqual([]);
    expect(service.vehicles().map(v => v.number)).toEqual(['44.201', '44.301', '20.410']);
    expect(fx.masterData.loads).toBe(0);
  });

  it('loads after login and clears after logout', async () => {
    fx.auth.subject.next({uid: 'u1', email: null});
    await flush();
    expect(service.persons().length).toBe(3);

    fx.auth.subject.next(null);
    await flush();
    expect(service.persons()).toEqual([]);
  });

  it('loads nothing for an account without access', async () => {
    fx.auth.loginAs('nobody', null);
    await flush();
    expect(fx.masterData.loads).toBe(0);
    expect(service.persons()).toEqual([]);
  });

  it('loads for the station login', async () => {
    fx.auth.loginAs('station', {email: 's@example.com', name: 'RK Strobl', role: 'STATION', active: true});
    await flush();
    expect(fx.masterData.loads).toBe(1);
  });

  it('offers only active entries, sorted', async () => {
    fx.auth.subject.next({uid: 'u1', email: null});
    await flush();
    expect(service.activePersons().map(p => p.name)).toEqual(['Aigner', 'Zeller']);
    expect(service.activeVehicles().map(v => v.number)).toEqual(['20.410', '44.201', '44.301', '80.103']);
  });

  it('knows the default vehicles even without stored vehicles', async () => {
    fx.masterData.vehicles = [];
    fx.auth.subject.next({uid: 'u1', email: null});
    await flush();
    expect(service.vehicleLabel('44.201')).toBe('44.201 (RTW)');
    expect(service.vehicleLabel('44.301')).toBe('44.301 (KTW)');
    expect(service.vehicleLabel('20.410')).toBe('20.410 (BTW)');
  });

  it('suggests vehicles for free-text input and keeps unknown numbers', async () => {
    fx.auth.subject.next({uid: 'u1', email: null});
    await flush();
    expect(service.suggestVehicles('').length).toBe(4);
    expect(service.suggestVehicles('44.').map(v => v.number)).toEqual(['44.201', '44.301']);
    expect(service.suggestVehicles('44.201').length).toBe(4);
    expect(service.suggestVehicles('99.123')).toEqual([]);
    expect(service.vehicleLabel('99.123')).toBe('99.123');
  });

  it('still resolves inactive entries for display', async () => {
    fx.auth.subject.next({uid: 'u1', email: null});
    await flush();
    expect(service.personName('9')).toBe('Former');
    expect(service.vehicleLabel('11.111')).toBe('11.111 (BTW)');
    expect(service.personName('unknown')).toBe('unknown');
  });
});
