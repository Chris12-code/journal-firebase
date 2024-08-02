import {TourShift, TourType} from "../tour-modal/tour-modal.component";

export class Tour {

    public type: string | null;
    public tourType: TourType | null;
    public tourShift: TourShift | null;
    public car: string | null;
    public driver: string | null;
    public tpf: string | null;
    public third: string | null;
    public start: Date | null;
    public end: Date | null;

    constructor(
        type?: string,
        tourType?: TourType,
        tourShift?: TourShift,
        car?: string,
        driver?: string,
        tpf?: string,
        third?: string,
        start?: Date,
        end?: Date
    ) {
        this.type = type != null ? type : null;
        this.tourType = tourType != null ? tourType : null;
        this.tourShift = tourShift != null ? tourShift : null;
        this.car = car != null ? car : null;
        this.driver = driver != null ? driver : null;
        this.tpf = tpf != null ? tpf : null;
        this.third = third != null ? third : null;
        this.start = start != null ? start : null;
        this.end = end != null ? end : null;
    }

}