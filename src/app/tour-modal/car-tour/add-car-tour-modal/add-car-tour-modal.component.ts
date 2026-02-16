import {Component, Inject, OnInit} from '@angular/core';
import {CarTour} from "../../../model/car-tour";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import {TourShift, TourType} from "../../tour-modal.component";
import {Person} from "../../../model/person";
import {PersonUtilsService} from "../../../lib/person-utils.service";
import {FormControl} from "@angular/forms";
import {map, Observable, startWith} from "rxjs";

export interface TourDialogResult {
    tour: CarTour;
    delete?: boolean;
}

@Component({
    selector: 'add-tour-modal',
    templateUrl: './add-car-tour-modal.component.html',
    styleUrls: ['./add-car-tour-modal.component.css'],
    providers: [PersonUtilsService],
    standalone: false
})
export class AddCarTourModalComponent implements OnInit {

    tour = new CarTour();
    persons: Person[];
    startDateTime = '';
    endDateTime = '';

    driverControl = new FormControl();
    carControl = new FormControl();
    tpfControl = new FormControl();
    thirdControl = new FormControl();

    filteredDrivers!: Observable<Person[]>;
    filteredCars!: Observable<string[]>;
    filteredTpf!: Observable<Person[]>;
    filteredThird!: Observable<Person[]>;

    constructor(
        public dialogRef: MatDialogRef<AddCarTourModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: TourDialogResult,
        private personUtilsService: PersonUtilsService,
    ) {
        this.tour = { ...data.tour } as CarTour;
        this.persons = this.personUtilsService.getAllPersons();
    }

    ngOnInit() {
        if (this.tour.driver) {
            this.driverControl.setValue(this.tour.driver.number);
        }

        if (this.tour.car) {
            this.carControl.setValue(this.tour.car);
        }

        if (this.tour.tpf) {
            this.tpfControl.setValue(this.tour.tpf.number);
        }

        if (this.tour.third) {
            this.thirdControl.setValue(this.tour.third.number);
        }

        if (this.tour.start) {
            this.startDateTime = this.toDateTimeLocal(this.toDate(this.tour.start));
        }

        if (this.tour.end) {
            this.endDateTime = this.toDateTimeLocal(this.toDate(this.tour.end));
        }

        this.filteredDrivers = this.driverControl.valueChanges.pipe(
            startWith(''),
            map(value => this._filterPersons(value, 'driver')),
        );

        this.filteredCars = this.carControl.valueChanges.pipe(
            startWith(''),
            map(value => this._filterCars(value)),
        );

        this.filteredTpf = this.tpfControl.valueChanges.pipe(
            startWith(''),
            map(value => this._filterPersons(value, 'tpf'))
        );

        this.filteredThird = this.thirdControl.valueChanges.pipe(
            startWith(''),
            map(value => this._filterPersons(value, 'third'))
        );

        this.driverControl.valueChanges.subscribe(() => {
            this.filteredTpf = this.tpfControl.valueChanges.pipe(
                startWith(''),
                map(value => this._filterPersons(value, 'tpf'))
            );

            this.filteredThird = this.thirdControl.valueChanges.pipe(
                startWith(''),
                map(value => this._filterPersons(value, 'third'))
            );
        });

        this.tpfControl.valueChanges.subscribe(() => {
            this.filteredDrivers = this.driverControl.valueChanges.pipe(
                startWith(''),
                map(value => this._filterPersons(value, 'driver'))
            );

            this.filteredThird = this.thirdControl.valueChanges.pipe(
                startWith(''),
                map(value => this._filterPersons(value, 'third'))
            );
        });

        this.thirdControl.valueChanges.subscribe(() => {
            this.filteredDrivers = this.driverControl.valueChanges.pipe(
                startWith(''),
                map(value => this._filterPersons(value, 'driver'))
            );

            this.filteredTpf = this.tpfControl.valueChanges.pipe(
                startWith(''),
                map(value => this._filterPersons(value, 'tpf'))
            );
        });
    }

    private _filterPersons(value: string, field: string): Person[] {
        const filterValue = value.toLowerCase();
        return this.persons
            .filter(person =>
                (person.name.toLowerCase().includes(filterValue) || person.number.includes(filterValue)) &&
                !this.isPersonAssigned(person, field)
            );
    }

    private isPersonAssigned(person: Person, field: string): boolean {
        if (field === 'driver') {
            return this.tpfControl.value === person.number || this.thirdControl.value === person.number;
        } else if (field === 'tpf') {
            return this.driverControl.value === person.number || this.thirdControl.value === person.number;
        } else if (field === 'third') {
            return this.driverControl.value === person.number || this.tpfControl.value === person.number;
        }
        return false;
    }

    private _filterCars(value: string): string[] {
        const filterValue = value.toLowerCase();
        const allCars = [ '44.201', '44.301', '80.103' ];
        return allCars
            .filter(car => car.toLowerCase().includes(filterValue) && car !== this.carControl.value);
    }

    submitted = false;

    onSubmit() {
        this.submitted = true;
    }

    newTour() {
        this.data.tour.tourType = this.tour.tourType;
        this.data.tour.tourShift = this.tour.tourShift;
        this.data.tour.car = this.carControl.value;
        this.data.tour.driver = this.getPerson(this.driverControl.value);
        this.data.tour.tpf = this.getPerson(this.tpfControl.value);
        this.data.tour.third = this.getPerson(this.thirdControl.value);
        this.data.tour.start = this.startDateTime ? new Date(this.startDateTime) : null;
        this.data.tour.end = this.endDateTime ? new Date(this.endDateTime) : null;
        this.dialogRef.close(this.data);
    }

    private toDate(value: any): Date {
        if (typeof value.toDate === 'function') return value.toDate();
        return new Date(value);
    }

    private toDateTimeLocal(date: Date): string {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    getPerson(number: string): Person | null {
        return this.persons.find(person => person.number === number) ?? null;
    }

    getTourTypes(): string[] {
        return Object.values(TourType);
    }

    getTourShifts(): string[] {
        return Object.values(TourShift);
    }
}
