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

  it('offers only active entries, sorted', async () => {
    fx.auth.subject.next({uid: 'u1', email: null});
    await flush();
    expect(service.activePersons().map(p => p.name)).toEqual(['Aigner', 'Zeller']);
    expect(service.activeVehicles().map(v => v.number)).toEqual(['44.201', '80.103']);
  });

  it('still resolves inactive entries for display', async () => {
    fx.auth.subject.next({uid: 'u1', email: null});
    await flush();
    expect(service.personName('9')).toBe('Former');
    expect(service.vehicleLabel('11.111')).toBe('11.111 (BTW)');
    expect(service.personName('unknown')).toBe('unknown');
  });
});
