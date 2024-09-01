import { Injectable } from '@angular/core';
import {
    Auth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut, User
} from '@angular/fire/auth';
import {BehaviorSubject, from} from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private userSubject = new BehaviorSubject<User | null>(null);
    user$ = this.userSubject.asObservable();

    constructor(private auth: Auth) {
        onAuthStateChanged(this.auth, (user) => {
            this.userSubject.next(user);
        });
    }

    login(email: string, password: string) {
        return from(signInWithEmailAndPassword(this.auth, email, password));
    }

    logout() {
        return from(signOut(this.auth));
    }

    get currentUser() {
        return this.auth.currentUser;
    }
}