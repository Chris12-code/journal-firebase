import { RescueOperationService as MockRescueOperationService } from "src/app/services/rescue-operation.mock.service";
import { RescueOperationService } from "src/app/services/rescue-operation.service";

export const environment = {
  production: false,
  providers: [
    { provide: MockRescueOperationService, useClass: RescueOperationService },
  ],
  firebase: {
    apiKey: "AIzaSyC_JozUyB_czB8HLKHeD30q-c_H1nJhwSI",
    authDomain: "rk-strobl-journalblatt.firebaseapp.com",
    projectId: "rk-strobl-journalblatt",
    storageBucket: "rk-strobl-journalblatt.appspot.com",
    messagingSenderId: "406445047954",
    appId: "1:406445047954:web:4dc4f3d2f592b26392664b"
  }
};
