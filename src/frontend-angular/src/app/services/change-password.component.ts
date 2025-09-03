// frontend/src/app/modules/teacher/change-password/change-password.component.ts
import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { UserService } from 'src/app/services/user.service';
import { AuthService } from 'src/app/services/auth.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-change-password',
    templateUrl: './change-password.component.html',
    styleUrls: ['./change-password.component.css']
})
export class ChangePasswordComponent {
    changePasswordForm = this.fb.group({
        currentPassword: ['', Validators.required],
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmNewPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });

    errorMessage: string = '';
    successMessage: string = '';

    constructor(
        private fb: FormBuilder,
        private userService: UserService,
        private authService: AuthService,
        private router: Router
    ) { }

    passwordMatchValidator(form: FormGroup) {
        return form.get('newPassword')?.value === form.get('confirmNewPassword')?.value
            ? null : { mismatch: true };
    }

    onSubmit() {
        if (this.changePasswordForm.valid) {
            const { currentPassword, newPassword } = this.changePasswordForm.value;

            this.userService.changePassword(currentPassword, newPassword).subscribe({
                next: () => {
                    this.successMessage = 'Senha alterada com sucesso!';
                    this.errorMessage = '';
                    this.changePasswordForm.reset();

                    // Deslogar após 3 segundos
                    setTimeout(() => {
                        this.authService.logout();
                    }, 3000);
                },
                error: (err) => {
                    this.errorMessage = err.error?.message || 'Erro ao alterar senha';
                    this.successMessage = '';
                }
            });
        }
    }
}