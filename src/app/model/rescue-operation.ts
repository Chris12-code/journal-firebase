import {CarTour} from "./car-tour";

export class RescueOperation {
    public id?: string;
    public patient?: string | null;
    public rescueType?: string | null;
    public rescueCategory?: string | null;
    public operationalLocation?: string | null;
    public destinationLocation?: string | null;
    public tour?: CarTour | null;

    constructor(
        id?: string, rescueType?: string, rescueCategory?: string, patient?: string,
        operationalLocation?: string, destinationLocation?: string, tour?: CarTour
    ) {
        this.id = id;
        this.rescueType = rescueType != null ? rescueType : null;
        this.rescueCategory = rescueCategory != null ? rescueCategory : null;
        this.patient = patient != null ? patient : null;
        this.operationalLocation = operationalLocation != null ? operationalLocation : null;
        this.destinationLocation = destinationLocation != null ? destinationLocation : null;
        this.tour = tour != null ? tour : null;
    }

    /* public getRescueType(): string {
        return this.rescueType;
    } */

    public setRescueType(value: string) {
        this.rescueType = value;
    }

    /* public getRescueCategory(): string {
        return this.rescueCategory;
    } */
    
    public setRescueCategory(value: string) {
        this.rescueCategory = value;
    }

    /* public getPatient(): string {
        return this.patient;
    } */

    public setPatient(patient: string) {
        this.patient = patient;
    }

    /* public getId(): string {
        return this.id;
    } */

    setId(id: string): void {
        this.id = id;
    }

    /* public getOperationalLocation(): string {
        return this.operationalLocation;
    } */

    public setOperationalLocation(operationalLocation: string): void {
        this.operationalLocation = operationalLocation;
    }

    /*
    public getDestinationLocation(): string {
        return this.destinationLocation;
    }
    */

    public setDestinationLocation(destinationLocation: string): void {
        this.destinationLocation = destinationLocation;
    }
}
