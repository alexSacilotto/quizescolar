import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ListaTestes.css';

const ListaTestes = () => {
    const [testes, setTestes] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchTestes = async () => {
            try {
                const res = await axios.get('http://localhost:3001/api/estudante/testes');
                setTestes(res.data);
                setLoading(false);
            } catch (error) {
                console.error(error);
                setLoading(false);
            }
        };

        fetchTestes();
    }, []);

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
                        onClick={() => navigate(`/estudante/testes/${teste.id}`)}
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