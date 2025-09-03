import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './IdentificacaoAluno.css';
import { API_BASE_URL } from '../../../config';

const IdentificacaoAluno = () => {
    const [nome, setNome] = useState('');
    const [numero, setNumero] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await axios.post(`${API_BASE_URL}/api/estudante/identificar`, {
                nome,
                numero
            });

            localStorage.setItem('aluno', JSON.stringify(response.data));
            navigate('/estudante/testes');
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    return (
        <div className="identificacao-aluno" style={{ backgroundColor: '#1976d2', color: 'white' }}>
            <div className="identificacao-box">
                <h2>Identificação do Aluno</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Nome:</label>
                        <input
                            type="text"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Número:</label>
                        <input
                            type="text"
                            value={numero}
                            onChange={(e) => setNumero(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" disabled={loading}>
                        {loading ? 'Carregando...' : 'Continuar'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default IdentificacaoAluno;