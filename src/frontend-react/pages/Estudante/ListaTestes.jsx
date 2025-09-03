import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ListaTestes.css';
import { API_BASE_URL } from '../../../config';

const ListaTestes = () => {
    const [testes, setTestes] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const aluno = localStorage.getItem('aluno');
        if (!aluno) {
            navigate('/estudante/identificar');
            return;
        }

        const fetchTestes = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/estudante/testes`);
                setTestes(res.data);
                setLoading(false);
            } catch (error) {
                console.error(error);
                setLoading(false);
            }
        };

        fetchTestes();
    }, [navigate]);

    if (loading) {
        return <div className="loading">Carregando testes disponíveis...</div>;
    }

    return (
        <div className="lista-testes" style={{ backgroundColor: '#1976d2', color: 'white' }}>
            <h1>Testes Disponíveis</h1>

            <div className="testes-grid">
                {testes.map(teste => (
                    <div
                        key={teste.id}
                        className="teste-card"
                        onClick={() => navigate(`/estudante/testes/${teste.id}`)} // Rota corrigida
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
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ListaTestes;