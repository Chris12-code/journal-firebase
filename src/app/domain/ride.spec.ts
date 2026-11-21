import {positionLabel, Ride} from './model';
import {crewAt, normalizeResources, prefillInstant, prefillRide, toursActiveAt, validateRide} from './ride';
import {endTour, replaceMember} from './tour';
import {dayTour, nightTour, t} from './testing/fixtures';

const validRide = (): Ride => ({
  tourId: 'day',
  vehicleIds: ['44.201'],
  alarmAt: t(7, 12),
  crew: [{personId: 'huber', role: 'DRIVER'}],
  type: 'RD',
});

describe('ride rules', () => {
  describe('alarm and return time', () => {
    it('accepts a ride without return time', () => {
      expect(validateRide(validRide())).toEqual([]);
    });

    it('rejects a return time before the alarm time', () => {
      const errors = validateRide({...validRide(), returnedAt: t(7)});
      expect(errors.map(e => e.code)).toEqual(['INVALID_RANGE']);
    });

    it('rejects a missing alarm time', () => {
      const errors = validateRide({...validRide(), alarmAt: new Date(NaN)});
      expect(errors.map(e => e.code)).toEqual(['MISSING_ALARM']);
    });
  });

  describe('tour selection', () => {
    it('offers the overtime DAY tour and the new NIGHT tour during the handover', () => {
      const day = endTour(dayTour(), t(18, 55));
      const offered = toursActiveAt([day, nightTour()], t(18, 20));
      expect(offered.map(x => x.id)).toEqual(['day', 'night']);
    });

    it('does not offer a tour that already ended', () => {
      const day = endTour(dayTour(), t(18, 55));
      expect(toursActiveAt([day, nightTour()], t(19, 10)).map(x => x.id)).toEqual(['night']);
    });

    it('rejects a ride without tour', () => {
      expect(validateRide({...validRide(), tourId: ''}).map(e => e.code)).toEqual(['MISSING_TOUR']);
    });
  });

  describe('vehicle actually used', () => {
    it('pre-fills the home vehicle', () => {
      expect(prefillRide(dayTour(), t(7)).vehicleIds).toEqual(['44.201']);
    });

    it('keeps the tour unchanged when the ride uses another vehicle', () => {
      const tour = dayTour();
      const ride: Ride = {...validRide(), ...prefillRide(tour, t(7)), vehicleIds: ['44.301'], type: 'KT'};
      expect(validateRide(ride)).toEqual([]);
      expect(ride.vehicleIds).toEqual(['44.301']);
      expect(tour.homeVehicleId).toBe('44.201');
    });

    it('leaves the vehicle empty for a tour without home vehicle and requires a choice', () => {
      const prefill = prefillRide(nightTour(), t(19));
      expect(prefill.vehicleIds).toEqual([]);
      const errors = validateRide({...validRide(), ...prefill});
      expect(errors.map(e => e.code)).toEqual(['MISSING_VEHICLE']);
    });
  });

  describe('crew snapshot', () => {
    it('pre-fills the crew active at the alarm time after a crew change', () => {
      const tour = replaceMember(dayTour(), 'p', 'beshiri', t(10, 30));
      expect(crewAt(tour, t(11, 40))).toEqual([
        {personId: 'huber', role: 'DRIVER'},
        {personId: 'beer', role: 'THIRD'},
        {personId: 'beshiri', role: 'TPF'},
      ]);
    });

    it('allows a manually reduced crew but not an empty one', () => {
      const prefill = prefillRide(dayTour(), t(8));
      const reduced = {...validRide(), ...prefill, crew: prefill.crew.filter(c => c.role !== 'THIRD')};
      expect(validateRide(reduced)).toEqual([]);
      expect(validateRide({...reduced, crew: []}).map(e => e.code)).toEqual(['EMPTY_CREW']);
    });

    it('uses the alarm time while the tour is active then', () => {
      expect(prefillInstant(dayTour(), t(8))).toEqual(t(8));
    });

    it('uses the tour start for an alarm before the tour', () => {
      expect(prefillInstant(nightTour(), t(17))).toEqual(t(18));
      expect(prefillRide(nightTour(), t(17)).crew.map(c => c.personId)).toEqual(['beshiri', 'eder']);
    });

    it('uses the last minute of an ended tour for an alarm after it', () => {
      const day = endTour(replaceMember(dayTour(), 'p', 'beshiri', t(10, 30)), t(18, 55));
      expect(prefillInstant(day, t(20))).toEqual(t(18, 54));
      expect(prefillRide(day, t(20)).crew.map(c => c.personId)).toEqual(['huber', 'beer', 'beshiri']);
    });

    it('is a copy that does not follow later tour edits', () => {
      const tour = dayTour();
      const ride: Ride = {...validRide(), ...prefillRide(tour, t(8))};
      replaceMember(tour, 'p', 'beshiri', t(9));
      tour.members[0].personId = 'someone-else';
      expect(ride.crew.map(c => c.personId)).toEqual(['huber', 'maier', 'beer']);
    });
  });

  describe('classification', () => {
    it('accepts a minimal ride with only the required fields', () => {
      expect(validateRide(validRide())).toEqual([]);
    });

    it('requires a ride type', () => {
      expect(validateRide({...validRide(), type: undefined}).map(e => e.code)).toEqual(['MISSING_TYPE']);
    });
  });
});

describe('transport vehicles', () => {
  const base = (): Ride => ({tourId: 'day', vehicleIds: ['44.201'], alarmAt: t(8), crew: [{personId: 'huber', role: 'DRIVER'}], type: 'RD'});

  it('requires exactly one vehicle', () => {
    expect(validateRide({...base(), vehicleIds: ['44.201', '44.301']}).map(e => e.code)).toEqual(['TOO_MANY_VEHICLES']);
    expect(validateRide({...base(), vehicleIds: ['  ']}).map(e => e.code)).toEqual(['MISSING_VEHICLE']);
  });

  it('treats a ride without kind as a transport', () => {
    expect(validateRide({...base(), tourId: undefined}).map(e => e.code)).toEqual(['MISSING_TOUR']);
  });
});

describe('ambulance shifts', () => {
  const seefest = (): Ride => ({
    kind: 'AMBULANCE',
    event: 'Seefest Strobl',
    alarmAt: t(14),
    returnedAt: t(23),
    vehicleIds: ['44.301', '45.201'],
    crew: [
      {personId: 'a', role: 'DRIVER'},
      {personId: 'b', role: 'TPF'},
      {personId: 'c', role: 'MEDIC'},
      {personId: 'd', role: 'LEAD'},
      {personId: 'e', role: 'Fußtrupp'},
    ],
    assistances: 3,
  });

  it('accepts an event with two cars, five people and assistances, without tour and type', () => {
    expect(validateRide(seefest())).toEqual([]);
  });

  it('accepts an ambulance shift without vehicles', () => {
    expect(validateRide({...seefest(), vehicleIds: []})).toEqual([]);
  });

  it('requires the end time', () => {
    expect(validateRide({...seefest(), returnedAt: undefined}).map(e => e.code)).toEqual(['MISSING_END']);
  });

  it('requires the end after the start', () => {
    expect(validateRide({...seefest(), returnedAt: t(13)}).map(e => e.code)).toEqual(['INVALID_RANGE']);
  });

  it('rejects negative or fractional assistances', () => {
    expect(validateRide({...seefest(), assistances: -1}).map(e => e.code)).toEqual(['INVALID_ASSISTANCES']);
    expect(validateRide({...seefest(), assistances: 1.5}).map(e => e.code)).toEqual(['INVALID_ASSISTANCES']);
    expect(validateRide({...seefest(), assistances: 0})).toEqual([]);
  });

  it('requires an event and must not reference a tour', () => {
    expect(validateRide({...seefest(), event: ' '}).map(e => e.code)).toEqual(['MISSING_EVENT']);
    expect(validateRide({...seefest(), tourId: 'day'}).map(e => e.code)).toEqual(['TOUR_ON_AMBULANCE']);
  });
});

describe('positions', () => {
  it('labels known positions and shows free text as entered', () => {
    expect(['DRIVER', 'TPF', 'THIRD', 'MEDIC', 'LEAD', 'TRAINEE'].map(positionLabel)).toEqual([
      'Fahrer', 'Transportführer', 'Dritter', 'Sanitäter', 'Einsatzleiter', 'Praktikant',
    ]);
    expect(positionLabel('Fußtrupp')).toBe('Fußtrupp');
  });
});

describe('additional resources', () => {
  it('trims, drops empty entries and removes duplicates', () => {
    expect(normalizeResources([' Polizei ', 'Notarzthubschrauber', '', 'polizei', 'Rotes Kreuz Bad Ischl'])).toEqual([
      'Polizei', 'Notarzthubschrauber', 'Rotes Kreuz Bad Ischl',
    ]);
    expect(normalizeResources(undefined)).toEqual([]);
  });
});
