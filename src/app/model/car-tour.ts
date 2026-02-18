import {TourShift, TourType} from "../tour-modal/tour-modal.component";
import {Person} from "./person";

export class CarTour {
    public id?: string;
    public tourType: TourType | null;
    public tourShift: TourShift | null;
    public car: string | null;
    public driver: Person | null;
    public tpf: Person | null;
    public third: Person | null;
    public start: Date | null;
    public end: Date | null;
    public visibleUntil: Date | null;

    constructor(
        id?: string,
        tourType?: TourType,
        tourShift?: TourShift,
        car?: string,
        driver?: Person,
        tpf?: Person,
        third?: Person,
        start?: Date,
        end?: Date,
        visibleUntil?: Date
    ) {
        this.id = id != null ? id : undefined;
        this.tourType = tourType != null ? tourType : null;
        this.tourShift = tourShift != null ? tourShift : null;
        this.car = car != null ? car : null;
        this.driver = driver != null ? driver : null;
        this.tpf = tpf != null ? tpf : null;
        this.third = third != null ? third : null;
        this.start = start != null ? start : null;
        this.end = end != null ? end : null;
        this.visibleUntil = visibleUntil != null ? visibleUntil : null;
    }

    setId(id: string): void {
        this.id = id;
    }

}