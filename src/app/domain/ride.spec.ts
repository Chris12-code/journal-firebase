import {Ride} from './model';
import {crewAt, prefillRide, toursActiveAt, validateRide} from './ride';
import {endTour, replaceMember} from './tour';
import {dayTour, nightTour, t} from './testing/fixtures';

const validRide = (): Ride => ({
  tourId: 'day',
  vehicleId: '44.201',
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
      expect(prefillRide(dayTour(), t(7)).vehicleId).toBe('44.201');
    });

    it('keeps the tour unchanged when the ride uses another vehicle', () => {
      const tour = dayTour();
      const ride: Ride = {...validRide(), ...prefillRide(tour, t(7)), vehicleId: '80.103', type: 'KT'};
      expect(validateRide(ride)).toEqual([]);
      expect(ride.vehicleId).toBe('80.103');
      expect(tour.homeVehicleId).toBe('44.201');
    });

    it('leaves the vehicle empty for a tour without home vehicle and requires a choice', () => {
      const prefill = prefillRide(nightTour(), t(19));
      expect(prefill.vehicleId).toBe('');
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
