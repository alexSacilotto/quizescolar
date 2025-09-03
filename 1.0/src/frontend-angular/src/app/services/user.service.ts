// frontend-angular/src/app/services/user.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
    providedIn: 'root'
})
export class UserService {
    constructor(private http: HttpClient) { }

    createUser(username: string, password: string) {
        return this.http.post<any>('/api/users', { username, password });
    }

    changePassword(currentPassword: string, newPassword: string) {
        return this.http.put<any>('/api/users/change-password', { currentPassword, newPassword });
    }
}