import {Person} from "../model/person";
import personsData from '../../data/persons.json';

export class PersonUtilsService {

    constructor() { }

    getAllPersons(): Person[] {
        return personsData.persons.map((person: any) => new Person(person.number, person.name, person.telephone, person.email));
    }

}