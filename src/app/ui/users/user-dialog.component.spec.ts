import {provideZonelessChangeDetection} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {fakeProviders} from '../../application/testing/fakes';
import {t} from '../../domain/testing/fixtures';
import {UserEntry} from '../../domain/user';
import {UserDialogComponent, UserDialogData} from './user-dialog.component';

const flush = () => new Promise(r => setTimeout(r));

const ADMIN: UserEntry = {uid: 'admin', email: 'admin@example.com', name: 'Chefin', role: 'ADMIN', active: true};
const STATION: UserEntry = {uid: 'station', email: 'station@example.com', name: 'RK Strobl', role: 'STATION', active: true};

describe('UserDialogComponent', () => {
  let fx: ReturnType<typeof fakeProviders>;
  let closed: unknown[];

  const open = async (data: UserDialogData): Promise<ComponentFixture<UserDialogComponent>> => {
    fx = fakeProviders(t(12));
    fx.users.store.next([ADMIN, STATION]);
    closed = [];
    TestBed.configureTestingModule({
      imports: [UserDialogComponent],
      providers: [
        ...fx.providers,
        provideZonelessChangeDetection(),
        {provide: MAT_DIALOG_DATA, useValue: data},
        {provide: MatDialogRef, useValue: {close: (v: unknown) => closed.push(v)}},
      ],
    });
    const {uid, ...entry} = ADMIN;
    fx.auth.loginAs(uid, entry);
    await flush();
    const fixture = TestBed.createComponent(UserDialogComponent);
    await fixture.whenStable();
    return fixture;
  };

  const el = (f: ComponentFixture<unknown>) => f.nativeElement as HTMLElement;
  const input = (f: ComponentFixture<unknown>, name: string) => el(f).querySelector<HTMLInputElement>(`input[name="${name}"]`);

  it('asks for email, initial password, name and role when adding', async () => {
    const f = await open({});
    expect(el(f).querySelector('h2')!.textContent).toContain('Benutzer hinzufügen');
    expect(input(f, 'email')!.readOnly).toBeFalse();
    expect(input(f, 'password')).not.toBeNull();
    expect(el(f).querySelector('mat-slide-toggle')).toBeNull();
  });

  it('adds a user and closes', async () => {
    const f = await open({});
    Object.assign(f.componentInstance, {email: 'neu@example.com', password: 'secret123', name: 'Neu', role: 'ADMIN'});
    await f.componentInstance.save();
    expect(fx.users.created).toEqual([{email: 'neu@example.com', password: 'secret123', name: 'Neu', role: 'ADMIN'}]);
    expect(closed).toEqual([true]);
  });

  it('shows the error and stays open when adding fails', async () => {
    const f = await open({});
    fx.users.failWith = 'auth/email-already-in-use';
    Object.assign(f.componentInstance, {email: 'neu@example.com', password: 'secret123', name: 'Neu'});
    await f.componentInstance.save();
    await f.whenStable();
    expect(el(f).querySelector('.error-text')!.textContent).toContain('bereits verwendet');
    expect(closed).toEqual([]);
  });

  it('edits another user with a read-only email and no password', async () => {
    const f = await open({user: STATION});
    expect(el(f).querySelector('h2')!.textContent).toContain('Benutzer bearbeiten');
    expect(input(f, 'email')!.readOnly).toBeTrue();
    expect(input(f, 'password')).toBeNull();
    expect(el(f).querySelector('mat-select')!.getAttribute('aria-disabled')).toBe('false');
    expect(el(f).querySelector('mat-slide-toggle button')!.hasAttribute('disabled')).toBeFalse();

    Object.assign(f.componentInstance, {name: 'Station', active: false});
    await f.componentInstance.save();
    expect(fx.users.store.value.find(u => u.uid === 'station')).toEqual({...STATION, name: 'Station', active: false});
    expect(closed).toEqual([true]);
  });

  it('locks role and active on the own entry', async () => {
    const f = await open({user: ADMIN});
    expect(el(f).querySelector('mat-select')!.getAttribute('aria-disabled')).toBe('true');
    expect(el(f).querySelector('mat-slide-toggle button')!.hasAttribute('disabled')).toBeTrue();
    expect(el(f).textContent).toContain('Die eigene Rolle kann man nicht ändern.');
  });
});
