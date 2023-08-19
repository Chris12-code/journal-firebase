export class RescueOperation {
    private id: String;
    public patient: Patient;
    public rescueType: RescueType;
    public rescueCategory: RescueCategory;
    public operationalLocation: String;
    public destinationLocation: String;

    constructor(
        id: String, patient: Patient, rescueType: RescueType, rescueCategory: RescueCategory,
        operationalLocation: String, destinationLocation: String
    ) {
        this.id = id;
        this.rescueType = rescueType;
        this.rescueCategory = rescueCategory;
        this.patient = patient;
        this.operationalLocation = operationalLocation;
        this.destinationLocation = destinationLocation;
    }

    public getRescueType(): RescueType {
        return this.rescueType;
    }

    public setRescueType(value: RescueType) {
        this.rescueType = value;
    }

    public getRescueCategory(): RescueCategory {
        return this.rescueCategory;
    }
    
    public setRescueCategory(value: RescueCategory) {
        this.rescueCategory = value;
    }

    public getPatient(): Patient {
        return this.patient;
    }

    public setPatient(patient: Patient) {
        this.patient = patient;
    }

    public getId(): String {
        return this.id;
    }

    setId(id: String): void {
        this.id = id;
    }

    public getOperationalLocation(): String {
        return this.operationalLocation;
    }

    public setOperationalLocation(operationalLocation: String): void {
        this.operationalLocation = operationalLocation;
    }

    public getDestinationLocation(): String {
        return this.destinationLocation;
    }

    public setDestinationLocation(destinationLocation: String): void {
        this.destinationLocation = destinationLocation;
    }
}

export enum RescueType {
    NA = 'NA',
    RD = 'RD',
    KT = 'KT'
}

export enum RescueCategory {
    CPR = 'CPR',
    VU = 'VU',
    CHILD = 'KINDER'
}

export enum Patient {
    MALE = 'M',
    FEMALE = 'F',
    CHILD = 'K'
}