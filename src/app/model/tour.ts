export class Tour {

    public driver: string | null;
    public tpf: string | null;
    public third: string | null;

    constructor(driver?: string, tpf?: string, third?: string) {
        this.driver = driver != null ? driver : null;
        this.tpf = tpf != null ? tpf : null;
        this.third = third != null ? third : null;
    }

}