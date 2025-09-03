import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ResultadoAluno.css';

const ResultadoAluno = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    // Na implementação real, você buscaria os resultados do localStorage ou da API
    const resultado = JSON.parse(localStorage.getItem('resultado') || '{}');

    return (
        <div className="resultado-aluno" style={{ backgroundColor: '#1976d2', color: 'white' }}>
            <h1>Seu Resultado</h1>

            <div className="resultado-info">
                <p>Você acertou <strong>{resultado.acertos}</strong> de <strong>{resultado.total}</strong> questões.</p>
                <p>Sua porcentagem de acertos: <strong>{resultado.porcentagem}%</strong></p>
            </div>

            <button
                onClick={() => navigate('/estudante/testes')}
                className="btn-voltar"
            >
                Voltar para Lista de Testes
            </button>
        </div>
    );
};

export default ResultadoAluno;