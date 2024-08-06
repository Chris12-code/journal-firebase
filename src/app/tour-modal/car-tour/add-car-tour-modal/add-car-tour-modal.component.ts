import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { CarTour } from "../../../model/car-tour";
import { MAT_DIALOG_DATA, MatDialogRef } from "@angular/material/dialog";
import { TourShift, TourType } from "../../tour-modal.component";
import { Person } from "../../../model/person";
import { PersonUtilsService } from "../../../lib/person-utils.service";
import { FormControl } from "@angular/forms";
import { map, Observable, startWith } from "rxjs";

export interface TourDialogResult {
    tour: CarTour;
    delete?: boolean;
}

@Component({
    selector: 'add-tour-modal',
    templateUrl: './add-car-tour-modal.component.html',
    styleUrls: ['./add-car-tour-modal.component.css'],
    providers: [PersonUtilsService],
})
export class AddCarTourModalComponent implements OnInit {

    @ViewChild('pickerStart') pickerStart: any;
    @ViewChild('pickerEnd') pickerEnd: any;

    tour = new CarTour();
    persons: Person[];

    driverControl = new FormControl();
    tpfControl = new FormControl();
    thirdControl = new FormControl();

    filteredDrivers!: Observable<Person[]>;
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

        if (this.tour.tpf) {
            this.tpfControl.setValue(this.tour.tpf.number);
        }

        if (this.tour.third) {
            this.thirdControl.setValue(this.tour.third.number);
        }

        this.filteredDrivers = this.driverControl.valueChanges.pipe(
            startWith(''),
            map(value => this._filterPersons(value, 'driver')),
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

    submitted = false;

    onSubmit() {
        this.submitted = true;
    }

    newTour() {
        this.data.tour.tourType = this.tour.tourType;
        this.data.tour.tourShift = TourShift.DAY;
        this.data.tour.car = '44.201';
        this.data.tour.driver = this.getPerson(this.driverControl.value);
        this.data.tour.tpf = this.getPerson(this.tpfControl.value);
        this.data.tour.third = this.getPerson(this.thirdControl.value);
        this.dialogRef.close(this.data);
    }

    getPerson(number: string): Person | null {
        return this.persons.find(person => person.number === number) ?? null;
    }

    getTourTypes(): string[] {
        return Object.values(TourType);
    }
}