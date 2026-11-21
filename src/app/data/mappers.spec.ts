import {Timestamp} from 'firebase/firestore';
import {Ride, Tour} from '../domain/model';
import {endMember} from '../domain/tour';
import {dayTour, t} from '../domain/testing/fixtures';
import {docToPerson, docToRide, docToTour, docToUserEntry, docToVehicle, rideToDoc, tourToDoc, userEntryToDoc} from './mappers';

describe('Firestore mappers', () => {
  it('round-trips an active tour and stores derived start / null end', () => {
    const tour = endMember(dayTour(), 'x', t(14));
    const doc = tourToDoc(tour);

    expect(doc['start']).toEqual(Timestamp.fromDate(t(6)));
    expect(doc['end']).toBeNull();
    expect(doc['members'][0]['to']).toBeNull();
    expect(doc['members'][2]['to']).toEqual(Timestamp.fromDate(t(14)));

    expect(doc['kind']).toBe('SHIFT');
    expect(doc['slotKey']).toBeNull();
    expect(docToTour('day', doc)).toEqual({...tour, kind: 'SHIFT', audit: undefined});
  });

  it('round-trips a tour without home vehicle as null and back to undefined', () => {
    const tour: Tour = {id: 'n', shift: 'NIGHT', members: [{id: 'm', personId: 'a', role: 'DRIVER', from: t(18), to: t(6, 0, 1)}]};
    const doc = tourToDoc(tour);
    expect(doc['homeVehicleId']).toBeNull();
    expect(doc['end']).toEqual(Timestamp.fromDate(t(6, 0, 1)));
    expect(docToTour('n', doc)).toEqual({...tour, kind: 'SHIFT', homeVehicleId: undefined, audit: undefined});
  });

  it('round-trips the tour kind and the slot link', () => {
    const shift: Tour = {...dayTour(), kind: 'SHIFT', slotKey: '2027-03-03|DAY|44.201'};
    expect(docToTour('day', tourToDoc(shift))).toEqual({...shift, audit: undefined});
    const extra: Tour = {...dayTour(), kind: 'EXTRA'};
    expect(docToTour('day', tourToDoc(extra))).toEqual({...extra, audit: undefined});
  });

  it('reads a stored tour without kind as a shift tour', () => {
    const {kind, slotKey, ...legacy} = tourToDoc(dayTour());
    expect(docToTour('day', legacy).kind).toBe('SHIFT');
  });

  it('round-trips a ride with optional fields as null', () => {
    const ride: Ride = {
      id: 'r',
      tourId: 'day',
      vehicleIds: ['44.301'],
      alarmAt: t(7, 12),
      crew: [{personId: 'huber', role: 'DRIVER'}],
      type: 'RD',
    };
    const doc = rideToDoc(ride);
    expect(doc['kind']).toBe('TRANSPORT');
    expect(doc['returnedAt']).toBeNull();
    expect(doc['category']).toBeNull();
    expect(docToRide('r', doc)).toEqual({
      ...ride,
      kind: 'TRANSPORT',
      returnedAt: undefined,
      category: undefined,
      patient: undefined,
      pickup: undefined,
      destination: undefined,
      event: undefined,
      assistances: undefined,
      resources: [],
      audit: undefined,
    });
  });

  it('round-trips an ambulance shift with vehicles, positions, assistances and resources', () => {
    const ride: Ride = {
      id: 'a',
      kind: 'AMBULANCE',
      event: 'Seefest Strobl',
      alarmAt: t(14),
      returnedAt: t(23),
      vehicleIds: ['44.301', '45.201'],
      crew: [{personId: 'a', role: 'MEDIC'}, {personId: 'b', role: 'Fußtrupp'}],
      assistances: 3,
      resources: ['Notarzthubschrauber', 'Polizei'],
    };
    const doc = rideToDoc(ride);
    expect(doc['tourId']).toBeNull();
    expect(docToRide('a', doc)).toEqual({
      ...ride,
      type: undefined,
      category: undefined,
      patient: undefined,
      pickup: undefined,
      destination: undefined,
      tourId: undefined,
      audit: undefined,
    });
  });

  it('normalizes resources when storing', () => {
    const doc = rideToDoc({tourId: 'x', vehicleIds: ['v'], alarmAt: t(8), crew: [], type: 'NA', resources: [' Polizei', 'polizei', '']});
    expect(doc['resources']).toEqual(['Polizei']);
  });

  it('reads a legacy single vehicleId as a list and defaults the kind', () => {
    const {vehicleIds, kind, ...legacy} = rideToDoc({tourId: 'x', vehicleIds: ['v'], alarmAt: t(8), crew: [], type: 'NA'});
    const ride = docToRide('r', {...legacy, vehicleId: '80.103'});
    expect(ride.vehicleIds).toEqual(['80.103']);
    expect(ride.kind).toBe('TRANSPORT');
  });

  it('reads author stamps', () => {
    const doc = {
      ...rideToDoc({tourId: 'x', vehicleIds: ['v'], alarmAt: t(8), crew: [], type: 'NA'}),
      createdBy: 'a', createdAt: Timestamp.fromDate(t(8)), updatedBy: 'b', updatedAt: Timestamp.fromDate(t(9)),
    };
    expect(docToRide('r', doc).audit).toEqual({createdBy: 'a', createdAt: t(8), updatedBy: 'b', updatedAt: t(9)});
  });

  it('uses document ids as business keys for master data and defaults active to true', () => {
    expect(docToPerson('07414', {name: 'Beer'})).toEqual({number: '07414', name: 'Beer', phone: undefined, email: undefined, active: true});
    expect(docToPerson('1', {name: 'X', active: false}).active).toBeFalse();
    expect(docToVehicle('80.103', {type: 'KTW', active: true})).toEqual({number: '80.103', type: 'KTW', active: true});
  });

  it('round-trips a user entry', () => {
    const entry = {uid: 'abc', email: 'station@example.com', name: 'RK Strobl', role: 'STATION' as const, active: true};
    const {uid, ...rest} = entry;
    const doc = userEntryToDoc(rest);
    expect(doc).toEqual({email: 'station@example.com', name: 'RK Strobl', role: 'STATION', active: true});
    expect(docToUserEntry(uid, doc)).toEqual(entry);
  });

  it('trims email and name of user entries', () => {
    expect(userEntryToDoc({email: ' a@b.at ', name: ' Max ', role: 'ADMIN', active: false}))
      .toEqual({email: 'a@b.at', name: 'Max', role: 'ADMIN', active: false});
  });

  it('falls back to the least access for incomplete user entries', () => {
    expect(docToUserEntry('x', {role: 'OWNER'})).toEqual({uid: 'x', email: '', name: '', role: 'STATION', active: false});
    expect(docToUserEntry('x', {role: 'ADMIN', active: 'true'}).active).toBeFalse();
  });
});
