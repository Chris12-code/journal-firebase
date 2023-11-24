import { Observable } from "rxjs";
import { RescueOperation } from "../models/rescue-operation.model";

export interface IRescueOperationService {
    getRescueOperations(): Observable<RescueOperation[]>;

    addRescueOperation(rescueOperation: RescueOperation): any;
}