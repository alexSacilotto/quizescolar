import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class AlunoService {
    private apiUrl = 'http://localhost:3001/api/estudante';

    constructor(private http: HttpClient) { }

    identificarAluno(dados: { nome: string, numero: string }): Observable<any> {
        return this.http.post(`${this.apiUrl}/identificar`, dados);
    }

    getTestesDisponiveis(): Observable<any> {
        return this.http.get(`${this.apiUrl}/testes`);
    }

    getTeste(id: number): Observable<any> {
        return this.http.get(`${this.apiUrl}/testes/${id}`);
    }

    enviarRespostas(id: number, dados: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/testes/${id}/respostas`, dados);
    }
}