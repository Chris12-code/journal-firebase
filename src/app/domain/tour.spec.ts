import {Tour} from './model';
import {
  activeMembersAt,
  addMember,
  endMember,
  endTour,
  extendTourEnd,
  findOverlaps,
  isActive,
  isCurrentTour,
  overlapWarnings,
  replaceMember,
  swapRoles,
  tourEnd,
  tourStart,
  validateTour,
} from './tour';
import {dayTour, t} from './testing/fixtures';

describe('tour rules', () => {
  describe('tour represents one shift', () => {
    it('accepts a tour with a home vehicle and one open driver entry', () => {
      const tour: Tour = {shift: 'DAY', homeVehicleId: '44.201', members: [{id: 'd', personId: 'huber', role: 'DRIVER', from: t(6)}]};
      expect(validateTour(tour)).toEqual([]);
      expect(isActive(tour)).toBeTrue();
    });

    it('accepts a tour without a vehicle', () => {
      const tour: Tour = {shift: 'NIGHT', members: [{id: 'd', personId: 'beer', role: 'DRIVER', from: t(18)}]};
      expect(validateTour(tour)).toEqual([]);
      expect(isActive(tour)).toBeTrue();
    });

    it('rejects a tour without crew', () => {
      const errors = validateTour({shift: 'DAY', members: []});
      expect(errors.map(e => e.code)).toEqual(['NO_CREW']);
    });
  });

  describe('tour kinds', () => {
    it('accepts a shift tour linked to a planned slot and an extra car tour without slot', () => {
      expect(validateTour({...dayTour(), kind: 'SHIFT', slotKey: '2027-03-03|DAY|44.201'})).toEqual([]);
      expect(validateTour({...dayTour(), kind: 'EXTRA'})).toEqual([]);
    });

    it('rejects an extra car tour linked to a planned slot', () => {
      expect(validateTour({...dayTour(), kind: 'EXTRA', slotKey: '2027-03-03|DAY|44.201'}).map(e => e.code)).toEqual(['SLOT_ON_EXTRA']);
    });
  });

  describe('crew members carry individual times', () => {
    it('rejects an end time before the start time', () => {
      const tour = endMember(dayTour(), 'd', t(5));
      const errors = validateTour(tour);
      expect(errors.map(e => e.code)).toEqual(['INVALID_RANGE']);
      expect(errors[0].memberId).toBe('d');
    });

    it('accepts an interval across midnight', () => {
      const tour: Tour = {shift: 'NIGHT', members: [{id: 'n', personId: 'beer', role: 'DRIVER', from: t(18), to: t(6, 0, 1)}]};
      expect(validateTour(tour)).toEqual([]);
      const m = tour.members[0];
      expect((m.to!.getTime() - m.from.getTime()) / 3_600_000).toBe(12);
    });
  });

  describe('crew can change during a tour', () => {
    it('third person leaves early while the others stay', () => {
      const tour = endMember(dayTour(), 'x', t(14));
      expect(tour.members.find(m => m.id === 'x')!.to).toEqual(t(14));
      expect(tour.members.filter(m => !m.to).map(m => m.id)).toEqual(['d', 'p']);
      expect(isActive(tour)).toBeTrue();
    });

    it('transport lead is replaced', () => {
      const tour = replaceMember(dayTour(), 'p', 'beshiri', t(10, 30), 'p2');
      const tpf = tour.members.filter(m => m.role === 'TPF');
      expect(tpf.length).toBe(2);
      expect(tpf[0]).toEqual(jasmine.objectContaining({personId: 'maier', from: t(6), to: t(10, 30)}));
      expect(tpf[1]).toEqual(jasmine.objectContaining({id: 'p2', personId: 'beshiri', from: t(10, 30)}));
      expect(tpf[1].to).toBeUndefined();
    });

    it('driver and transport lead swap roles', () => {
      const tour = swapRoles(dayTour(), 'd', 'p', t(12), ['d2', 'p2']);
      const huber = tour.members.filter(m => m.personId === 'huber');
      const maier = tour.members.filter(m => m.personId === 'maier');
      expect(huber.map(m => [m.role, m.from, m.to])).toEqual([['DRIVER', t(6), t(12)], ['TPF', t(12), undefined]]);
      expect(maier.map(m => [m.role, m.from, m.to])).toEqual([['TPF', t(6), t(12)], ['DRIVER', t(12), undefined]]);
    });

    it('a member can be added later', () => {
      const tour = addMember(dayTour(), {personId: 'neu', role: 'THIRD', from: t(9)}, 'n');
      expect(tour.members.length).toBe(4);
      expect(activeMembersAt(tour, t(8)).map(m => m.id)).toEqual(['d', 'p', 'x']);
      expect(activeMembersAt(tour, t(9)).map(m => m.id)).toEqual(['d', 'p', 'x', 'n']);
    });
  });

  describe('ending a tour', () => {
    it('closes every open member entry with the end time (overtime)', () => {
      const tour = endTour(endMember(dayTour(), 'x', t(14)), t(18, 55));
      expect(tour.members.map(m => m.to)).toEqual([t(18, 55), t(18, 55), t(14)]);
      expect(isActive(tour)).toBeFalse();
    });
  });

  describe('derived start and end', () => {
    it('start is the earliest member start, end is missing while active', () => {
      const tour = endMember(dayTour(), 'x', t(14));
      expect(tourStart(tour)).toEqual(t(6));
      expect(tourEnd(tour)).toBeUndefined();
    });

    it('end is the latest member end once all entries are closed', () => {
      const tour = endTour(endMember(dayTour(), 'x', t(14)), t(18, 55));
      expect(tourEnd(tour)).toEqual(t(18, 55));
    });
  });
});

describe('current tours (daily view window)', () => {
  const H = 3_600_000;
  const ended = endTour(dayTour(), t(18, 55)); // 06:00–18:55

  it('keeps active tours, also in overtime', () => {
    expect(isCurrentTour(dayTour(), t(23), 4 * H)).toBeTrue();
  });

  it('keeps tours ended at most the window ago', () => {
    expect(isCurrentTour(ended, t(22, 55), 4 * H)).toBeTrue();
    expect(isCurrentTour(ended, t(22, 56), 4 * H)).toBeFalse();
  });

  it('shows tours starting within the window only', () => {
    expect(isCurrentTour(dayTour(), t(3), 4 * H)).toBeTrue(); // starts at 06:00, in 3 h
    expect(isCurrentTour(dayTour(), t(1), 4 * H)).toBeFalse(); // starts in 5 h
  });
});

describe('extending the tour end', () => {
  // Third person left at 14:00, the rest ended the tour at 18:55
  const ended = endTour(endMember(dayTour(), 'x', t(14)), t(18, 55));

  it('moves the end of the members who closed the tour to a later ride end', () => {
    const tour = extendTourEnd(ended, t(19, 40));
    expect(tour.members.map(m => m.to)).toEqual([t(19, 40), t(19, 40), t(14)]);
    expect(tourEnd(tour)).toEqual(t(19, 40));
  });

  it('leaves the tour unchanged for an earlier time or an active tour', () => {
    expect(extendTourEnd(ended, t(18))).toBe(ended);
    expect(extendTourEnd(ended, t(18, 55))).toBe(ended);
    const active = dayTour();
    expect(extendTourEnd(active, t(20))).toBe(active);
  });
});

describe('overlap warnings', () => {
  it('warns when the same person is on two tours at the same time', () => {
    const day = endTour(dayTour(), t(18, 55));
    const night: Tour = {id: 'night', shift: 'NIGHT', members: [{id: 'n1', personId: 'huber', role: 'DRIVER', from: t(18)}]};
    const warnings = overlapWarnings(night, [day]);
    expect(warnings).toEqual([
      {memberId: 'n1', personId: 'huber', conflictTourId: 'day', conflictMemberId: 'd', sameTour: false},
    ]);
  });

  it('does not warn for consecutive entries (handover at the same minute)', () => {
    const day = endTour(dayTour(), t(18));
    const night: Tour = {id: 'night', shift: 'NIGHT', members: [{id: 'n1', personId: 'huber', role: 'DRIVER', from: t(18)}]};
    expect(overlapWarnings(night, [day])).toEqual([]);
  });

  it('warns for overlapping entries of the same person within one tour', () => {
    const tour = addMember(dayTour(), {personId: 'huber', role: 'TPF', from: t(10)}, 'dup');
    const warnings = overlapWarnings(tour, []);
    expect(warnings.map(w => [w.memberId, w.conflictMemberId, w.sameTour])).toEqual([
      ['d', 'dup', true],
      ['dup', 'd', true],
    ]);
  });

  it('does not warn for a role swap within one tour', () => {
    const tour = swapRoles(dayTour(), 'd', 'p', t(12));
    expect(overlapWarnings(tour, [])).toEqual([]);
  });

  it('ignores the stored version of the tour being edited', () => {
    const stored = dayTour();
    const edited = endMember(dayTour(), 'x', t(14));
    expect(overlapWarnings(edited, [stored])).toEqual([]);
  });

  it('findOverlaps lists all conflicting entries of a person', () => {
    const hits = findOverlaps('huber', {from: t(17), to: t(20)}, [dayTour()]);
    expect(hits.map(h => h.member.id)).toEqual(['d']);
  });
});
