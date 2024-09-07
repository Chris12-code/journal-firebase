import {CarTour} from "./car-tour";

export class RescueOperation {
    public id?: string;
    public patient?: string | null;
    public rescueType?: string | null;
    public rescueCategory?: string | null;
    public operationalLocation?: string | null;
    public destinationLocation?: string | null;
    public tour?: CarTour | null;
    public timeStamp: Date | null;

    constructor(
        id?: string, rescueType?: string, rescueCategory?: string, patient?: string,
        operationalLocation?: string, destinationLocation?: string, tour?: CarTour, timeStamp?: Date
    ) {
        this.id = id;
        this.rescueType = rescueType != null ? rescueType : null;
        this.rescueCategory = rescueCategory != null ? rescueCategory : null;
        this.patient = patient != null ? patient : null;
        this.operationalLocation = operationalLocation != null ? operationalLocation : null;
        this.destinationLocation = destinationLocation != null ? destinationLocation : null;
        this.tour = tour != null ? tour : null;
        this.timeStamp = timeStamp != null ? timeStamp : null;
    }
}
