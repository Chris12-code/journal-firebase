import {Timestamp} from 'firebase/firestore';
import {Ride, Tour} from '../domain/model';
import {endMember} from '../domain/tour';
import {dayTour, t} from '../domain/testing/fixtures';
import {docToPerson, docToRide, docToTour, docToVehicle, rideToDoc, tourToDoc} from './mappers';

describe('Firestore mappers', () => {
  it('round-trips an active tour and stores derived start / null end', () => {
    const tour = endMember(dayTour(), 'x', t(14));
    const doc = tourToDoc(tour);

    expect(doc['start']).toEqual(Timestamp.fromDate(t(6)));
    expect(doc['end']).toBeNull();
    expect(doc['members'][0]['to']).toBeNull();
    expect(doc['members'][2]['to']).toEqual(Timestamp.fromDate(t(14)));

    expect(docToTour('day', doc)).toEqual({...tour, audit: undefined});
  });

  it('round-trips a tour without home vehicle as null and back to undefined', () => {
    const tour: Tour = {id: 'n', shift: 'NIGHT', members: [{id: 'm', personId: 'a', role: 'DRIVER', from: t(18), to: t(6, 0, 1)}]};
    const doc = tourToDoc(tour);
    expect(doc['homeVehicleId']).toBeNull();
    expect(doc['end']).toEqual(Timestamp.fromDate(t(6, 0, 1)));
    expect(docToTour('n', doc)).toEqual({...tour, homeVehicleId: undefined, audit: undefined});
  });

  it('round-trips a ride with optional fields as null', () => {
    const ride: Ride = {
      id: 'r',
      tourId: 'day',
      vehicleId: '80.103',
      alarmAt: t(7, 12),
      crew: [{personId: 'huber', role: 'DRIVER'}],
      type: 'RD',
    };
    const doc = rideToDoc(ride);
    expect(doc['returnedAt']).toBeNull();
    expect(doc['category']).toBeNull();
    expect(docToRide('r', doc)).toEqual({
      ...ride,
      returnedAt: undefined,
      category: undefined,
      patient: undefined,
      pickup: undefined,
      destination: undefined,
      audit: undefined,
    });
  });

  it('reads author stamps', () => {
    const doc = {
      ...rideToDoc({tourId: 'x', vehicleId: 'v', alarmAt: t(8), crew: [], type: 'NA'}),
      createdBy: 'a', createdAt: Timestamp.fromDate(t(8)), updatedBy: 'b', updatedAt: Timestamp.fromDate(t(9)),
    };
    expect(docToRide('r', doc).audit).toEqual({createdBy: 'a', createdAt: t(8), updatedBy: 'b', updatedAt: t(9)});
  });

  it('uses document ids as business keys for master data and defaults active to true', () => {
    expect(docToPerson('07414', {name: 'Beer'})).toEqual({number: '07414', name: 'Beer', phone: undefined, email: undefined, active: true});
    expect(docToPerson('1', {name: 'X', active: false}).active).toBeFalse();
    expect(docToVehicle('80.103', {type: 'KTW', active: true})).toEqual({number: '80.103', type: 'KTW', active: true});
  });
});
