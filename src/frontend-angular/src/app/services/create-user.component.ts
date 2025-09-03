// frontend/src/app/modules/teacher/create-user/create-user.component.ts
import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { UserService } from 'src/app/services/user.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-create-user',
    templateUrl: './create-user.component.html',
    styleUrls: ['./create-user.component.css']
})
export class CreateUserComponent {
    createUserForm = this.fb.group({
        username: ['', [Validators.required, Validators.minLength(3)]],
        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });

    errorMessage: string = '';
    successMessage: string = '';

    constructor(
        private fb: FormBuilder,
        private userService: UserService,
        private router: Router
    ) { }

    passwordMatchValidator(form: FormGroup) {
        return form.get('password')?.value === form.get('confirmPassword')?.value
            ? null : { mismatch: true };
    }

    onSubmit() {
        if (this.createUserForm.valid) {
            const { username, password } = this.createUserForm.value;

            this.userService.createUser(username, password).subscribe({
                next: () => {
                    this.successMessage = 'Usuário criado com sucesso!';
                    this.errorMessage = '';
                    this.createUserForm.reset();
                },
                error: (err) => {
                    this.errorMessage = err.error?.message || 'Erro ao criar usuário';
                    this.successMessage = '';
                }
            });
        }
    }
}