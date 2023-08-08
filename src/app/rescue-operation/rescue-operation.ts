export class RescueOperation {
    id: String;
    operationalLocation: String;
    destinationLocation: String;

    constructor(id: string, operationalLocation: String, destinationLocation: String) {
        this.id = id;
        this.operationalLocation = operationalLocation;
        this.destinationLocation = destinationLocation;
    }

    getId(): String {
        return this.id;
    }

    setId(id: String): void {
        this.id = id;
    }

    getOperationalLocation(): String {
        return this.operationalLocation;
    }

    setOperationalLocation(operationalLocation: String): void {
        this.operationalLocation = operationalLocation;
    }

    getDestinationLocation(): String {
        return this.destinationLocation;
    }

    setDestinationLocation(destinationLocation: String): void {
        this.destinationLocation = destinationLocation;
    }
}