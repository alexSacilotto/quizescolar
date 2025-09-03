import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './ListaTestesProfessor.css';
import { API_BASE_URL } from '../../../config';

const ListaTestesProfessor = () => {
    const [testes, setTestes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/professor/login');
            return;
        }

        const fetchTestes = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL }/api/professor/testes`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setTestes(response.data);
                setLoading(false);
            } catch (error) {
                console.error('Erro ao buscar testes:', error);
                setError('Erro ao carregar testes');
                setLoading(false);
            }
        };

        fetchTestes();
    }, [navigate]);

    if (loading) {
        return <div className="loading">Carregando testes...</div>;
    }

    if (error) {
        return <div className="error">{error}</div>;
    }

    return (
        <div className="lista-testes-professor">
            <h1>Meus Testes</h1>

            <button
                onClick={() => navigate('/professor/testes/novo')}
                className="btn-novo-teste"
            >
                Criar Novo Teste
            </button>

            <div className="testes-grid">
                {testes.length === 0 ? (
                    <p>Nenhum teste criado ainda.</p>
                ) : (
                    testes.map(teste => (
                        <div
                            key={teste.id}
                            className="teste-card"
                            onClick={() => navigate(`/professor/testes/${teste.id}/resultados`)}
                        >
                            <h2>{teste.titulo}</h2>
                            {teste.tema_nome && <p>Tema: {teste.tema_nome}</p>}
                            {teste.dificuldade && (
                                <p>Dificuldade:
                                    <span className={`dificuldade ${teste.dificuldade}`}>
                                        {teste.dificuldade}
                                    </span>
                                </p>
                            )}
                            <p>Criado em: {new Date(teste.created_at).toLocaleDateString()}</p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default ListaTestesProfessor;