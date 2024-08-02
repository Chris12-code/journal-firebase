export class Tour {

    public type: string | null;
    public driver: string | null;
    public tpf: string | null;
    public third: string | null;
    public start: Date | null;
    public end: Date | null;

    constructor(type?: string, driver?: string, tpf?: string, third?: string, start?: Date, end?: Date) {
        this.type = type != null ? type : null;
        this.driver = driver != null ? driver : null;
        this.tpf = tpf != null ? tpf : null;
        this.third = third != null ? third : null;
        this.start = start != null ? start : null;
        this.end = end != null ? end : null;
    }

}