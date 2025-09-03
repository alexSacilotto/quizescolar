// frontend/src/app/modules/teacher/teacher.module.ts
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TeacherRoutingModule } from './teacher-routing.module';
import { LoginComponent } from './login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { QuestionFormComponent } from './question-form/question-form.component';
import { ResultsComponent } from './results/results.component';
import { CreateUserComponent } from './create-user/create-user.component';
import { ChangePasswordComponent } from './change-password/change-password.component';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

@NgModule({
    declarations: [
        LoginComponent,
        DashboardComponent,
        QuestionFormComponent,
        ResultsComponent,
        CreateUserComponent,
        ChangePasswordComponent
    ],
    imports: [
        CommonModule,
        TeacherRoutingModule,
        FormsModule,
        ReactiveFormsModule,
        HttpClientModule
    ]
})
export class TeacherModule { }