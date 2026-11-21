import {provideZonelessChangeDetection} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';
import {fakeProviders} from '../application/testing/fakes';
import {t} from '../domain/testing/fixtures';
import {AppComponent} from './app.component';

const flush = () => new Promise(r => setTimeout(r));

describe('AppComponent navigation', () => {
  let fx: ReturnType<typeof fakeProviders>;

  beforeEach(() => {
    fx = fakeProviders(t(12));
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        ...fx.providers,
        provideZonelessChangeDetection(),
        provideRouter([
          {path: 'kein-zugang', children: []},
          {path: 'fahrten', children: []},
          {path: 'bericht', children: []},
          {path: 'benutzer', children: []},
        ]),
      ],
    });
  });

  const render = async () => {
    const fixture = TestBed.createComponent(AppComponent);
    await flush();
    await fixture.whenStable();
    return fixture;
  };

  const links = (el: HTMLElement) => [...el.querySelectorAll('nav a')].map(a => a.textContent!.replace(/^\s*\S+\s+/, '').trim());
  const entry = (role: 'STATION' | 'ADMIN', active = true) => ({email: 'x@example.com', name: 'X', role, active});

  it('shows no navigation while logged out', async () => {
    const fixture = await render();
    expect(links(fixture.nativeElement)).toEqual([]);
  });

  it('shows only rides and tours to the station login', async () => {
    fx.auth.loginAs('station', entry('STATION'));
    const fixture = await render();
    expect(links(fixture.nativeElement)).toEqual(['Fahrten', 'Dienstmannschaft']);
  });

  it('shows the report and user maintenance to admins', async () => {
    fx.auth.loginAs('admin', entry('ADMIN'));
    const fixture = await render();
    expect(links(fixture.nativeElement)).toEqual(['Fahrten', 'Dienstmannschaft', 'Jahresbericht', 'Benutzer']);
  });

  it('shows no navigation to an account without access and sends it to "Kein Zugang"', async () => {
    fx.auth.loginAs('nobody', null);
    const fixture = await render();
    expect(links(fixture.nativeElement)).toEqual([]);
    expect(TestBed.inject(Router).url).toBe('/kein-zugang');
  });

  it('leaves the admin pages when an admin is demoted', async () => {
    fx.auth.loginAs('admin', entry('ADMIN'));
    const fixture = await render();
    await TestBed.inject(Router).navigateByUrl('/bericht');
    fx.auth.setEntry('admin', entry('STATION'));
    await flush();
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/fahrten');
    expect(links(fixture.nativeElement)).toEqual(['Fahrten', 'Dienstmannschaft']);
  });
});
