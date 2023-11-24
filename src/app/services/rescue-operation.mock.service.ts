import { Injectable } from '@angular/core';
import { Observable, of } from "rxjs";
import { IRescueOperationService } from './rescue-operation.service.interface';
import { Patient, RescueCategory, RescueType } from '../rescue-operation/rescue-operation';
import { RescueOperation } from "../models/rescue-operation.model";

@Injectable({
  providedIn: 'root'
})
export class RescueOperationService implements IRescueOperationService {

  rescueOperations: RescueOperation[] = [
    {
      id: '1',
      rescueType: RescueType.RD,
      rescueCategory: RescueCategory.VU,
      patient: Patient.MALE,
      operationalLocation: 'Postalmstraße',
      destinationLocation: 'UKH Salzburg'
    },
    {
      id: '2',
      rescueType: RescueType.KT,
      rescueCategory: RescueCategory.CHILD,
      patient: Patient.CHILD,
      operationalLocation: 'VS Strobl',
      destinationLocation: 'LKH Salzburg'
    },
    {
      id: '3',
      rescueType: RescueType.NA,
      rescueCategory: RescueCategory.CPR,
      patient: Patient.MALE,
      operationalLocation: 'Seniorenwohnheim Strobl',
      destinationLocation: 'LKH Salzburg'
    }
  ]

  getRescueOperations(): Observable<RescueOperation[]> {
    return of(this.rescueOperations);
  }

  addRescueOperation(rescueOperation: RescueOperation) {
    this.rescueOperations.push(rescueOperation);
  }
}
