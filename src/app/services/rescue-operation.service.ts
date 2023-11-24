import { Injectable } from '@angular/core';
import { IRescueOperationService } from './rescue-operation.service.interface';
import { Observable } from "rxjs";
import { RescueOperation } from "../models/rescue-operation.model";

@Injectable({
  providedIn: 'root'
})
export class RescueOperationService implements IRescueOperationService {

  constructor() { }

  getRescueOperations(): Observable<RescueOperation[]> {
    //TODO: firebase implementatin
    return new Observable<RescueOperation[]>;
  }

  addRescueOperation(rescueOperation: RescueOperation) {
    //TODO: firebase implementatin
  }
}

