import {DEFAULT_VEHICLES, normalizeVehicleNumber, withDefaultVehicles} from './vehicles';

describe('vehicles', () => {
  it('provides the default RTW, KTW and BTW', () => {
    expect(DEFAULT_VEHICLES.map(v => [v.number, v.type, v.active])).toEqual([
      ['44.201', 'RTW', true],
      ['44.301', 'KTW', true],
      ['20.410', 'BTW', true],
    ]);
  });

  it('keeps the defaults when nothing is stored', () => {
    expect(withDefaultVehicles([])).toEqual([...DEFAULT_VEHICLES]);
  });

  it('adds stored vehicles with other numbers', () => {
    const merged = withDefaultVehicles([{number: '80.103', type: 'KTW', active: true}]);
    expect(merged.map(v => v.number)).toEqual(['44.201', '44.301', '20.410', '80.103']);
  });

  it('lets a stored vehicle override a default, e.g. to deactivate it', () => {
    const merged = withDefaultVehicles([{number: ' 20.410 ', type: 'BTW', active: false}]);
    expect(merged.find(v => v.number === '20.410')!.active).toBeFalse();
    expect(merged.length).toBe(3);
  });

  it('trims free-text vehicle numbers', () => {
    expect(normalizeVehicleNumber('  99.123 ')).toBe('99.123');
    expect(normalizeVehicleNumber(undefined)).toBe('');
  });
});
