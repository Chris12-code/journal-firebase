import {Component, Inject} from '@angular/core';
import {AuthService} from "../lib/auth.service";
import {FormsModule} from "@angular/forms";
import {MAT_DIALOG_DATA, MatDialogRef} from "@angular/material/dialog";
import { UserCredential } from '@angular/fire/auth/public_api';
import {MatCardModule} from "@angular/material/card";
import {MatInputModule} from "@angular/material/input";

export interface LoginDialogResult {
    userCredential: UserCredential | null;
}

@Component({
    selector: 'app-login',
    templateUrl: './login-modal.component.html',
    styleUrls: ['./login-modal.component.css'],
    standalone: true,
    imports: [
        FormsModule,
        MatCardModule,
        MatInputModule
    ],
})
export class LoginComponent {
    email: string = '';
    password: string = '';

    constructor(
        public dialogRef: MatDialogRef<LoginComponent>,
        private authService: AuthService,
        @Inject(MAT_DIALOG_DATA) public data: LoginDialogResult,
    ) {}

    login() {
        this.authService.login(this.email, this.password).subscribe({
            next: (user: UserCredential) => {
                this.data.userCredential = user;
                this.dialogRef.close(this.data);
            },
            error: (err) => {
                console.error('Login error:', err);
                this.data.userCredential = null;
                this.dialogRef.close(this.data);
            }
        });
    }
}
