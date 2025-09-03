import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './CadastroTemas.css';
import { API_BASE_URL } from '../../../config';

const CadastroTemas = () => {
    const [temas, setTemas] = useState([]);
    const [novoTema, setNovoTema] = useState({
        nome: '',
        descricao: ''
    });
    const [editando, setEditando] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/professor/login');
            return;
        }

        const fetchTemas = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL }/api/professor/temas`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setTemas(res.data);
            } catch (error) {
                console.error(error);
            }
        };

        fetchTemas();
    }, [navigate]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNovoTema(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');

        try {
            if (editando) {
                await axios.put(`${API_BASE_URL }/api/professor/temas/${editando}`, novoTema, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${API_BASE_URL }/api/professor/temas`, novoTema, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }

            // Recarregar a lista de temas
            const res = await axios.get(`${API_BASE_URL }/api/professor/temas`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTemas(res.data);

            // Limpar formulário
            setNovoTema({ nome: '', descricao: '' });
            setEditando(null);
        } catch (error) {
            console.error(error);
        }
    };

    const handleEditar = (tema) => {
        setNovoTema({
            nome: tema.nome,
            descricao: tema.descricao
        });
        setEditando(tema.id);
    };

    const handleCancelar = () => {
        setNovoTema({ nome: '', descricao: '' });
        setEditando(null);
    };

    return (
        <div className="cadastro-temas-container">
            <div className="cadastro-temas-form">
                <h2>{editando ? 'Editar Tema' : 'Cadastrar Novo Tema'}</h2>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Nome do Tema:</label>
                        <input
                            type="text"
                            name="nome"
                            value={novoTema.nome}
                            onChange={handleInputChange}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>Descrição:</label>
                        <textarea
                            name="descricao"
                            value={novoTema.descricao}
                            onChange={handleInputChange}
                            rows="4"
                            required
                        />
                    </div>

                    <div className="form-buttons">
                        <button type="submit">
                            {editando ? 'Atualizar' : 'Salvar'}
                        </button>
                        {editando && (
                            <button type="button" onClick={handleCancelar}>
                                Cancelar
                            </button>
                        )}
                    </div>
                </form>
            </div>

            <div className="lista-temas-container">
                <h2>Temas Cadastrados</h2>
                <div className="lista-temas-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Nome</th>
                                <th>Descrição</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {temas.map(tema => (
                                <tr key={tema.id}>
                                    <td>{tema.id}</td>
                                    <td>{tema.nome}</td>
                                    <td className="descricao-cell">{tema.descricao}</td>
                                    <td>
                                        <button
                                            onClick={() => handleEditar(tema)}
                                            className="btn-editar"
                                        >
                                            Editar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CadastroTemas;