import {Person} from '../../domain/model';
import {filterPersons} from './person-field.component';

describe('filterPersons', () => {
  const persons: Person[] = [
    {number: '1001', name: 'Anna Aigner', active: true},
    {number: '1002', name: 'Bernd Bauer', active: true},
    {number: '2001', name: 'Clara Zeller', active: true},
  ];

  it('offers all persons for empty text or the selected name', () => {
    expect(filterPersons(persons, '', '').length).toBe(3);
    expect(filterPersons(persons, 'Bernd Bauer', 'Bernd Bauer').length).toBe(3);
  });

  it('matches name parts case-insensitively', () => {
    expect(filterPersons(persons, 'aig', '').map(p => p.number)).toEqual(['1001']);
  });

  it('matches employee numbers', () => {
    expect(filterPersons(persons, '100', '').map(p => p.number)).toEqual(['1001', '1002']);
  });
});
