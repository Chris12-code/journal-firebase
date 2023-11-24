import { Patient, RescueCategory, RescueType } from "../rescue-operation/rescue-operation";

export interface RescueOperation {
    id: string,
    rescueType: RescueType,
    rescueCategory: RescueCategory,
    patient: Patient,
    operationalLocation: string,
    destinationLocation: string
}