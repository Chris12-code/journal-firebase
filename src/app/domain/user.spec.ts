import {accessOf, selfEditRestrictions, UserEntry} from './user';

const entry = (over: Partial<UserEntry> = {}): UserEntry => ({
  uid: 'u1',
  email: 'u1@example.com',
  name: 'Test',
  role: 'STATION',
  active: true,
  ...over,
});

describe('user', () => {
  describe('accessOf', () => {
    it('is NONE without an entry', () => {
      expect(accessOf(null)).toBe('NONE');
      expect(accessOf(undefined)).toBe('NONE');
    });

    it('is NONE for an inactive entry', () => {
      expect(accessOf(entry({role: 'ADMIN', active: false}))).toBe('NONE');
    });

    it('is the role of an active entry', () => {
      expect(accessOf(entry({role: 'STATION'}))).toBe('STATION');
      expect(accessOf(entry({role: 'ADMIN'}))).toBe('ADMIN');
    });
  });

  describe('selfEditRestrictions', () => {
    for (const role of ['STATION', 'ADMIN'] as const) {
      it(`locks role and active and forbids removal on the own entry (${role})`, () => {
        expect(selfEditRestrictions('u1', entry({role}))).toEqual({roleLocked: true, activeLocked: true, canRemove: false});
      });

      it(`allows everything on another entry (${role})`, () => {
        expect(selfEditRestrictions('admin', entry({role}))).toEqual({roleLocked: false, activeLocked: false, canRemove: true});
      });
    }
  });
});
