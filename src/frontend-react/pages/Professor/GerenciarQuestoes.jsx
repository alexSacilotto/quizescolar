import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './GerenciarQuestoes.css';
import { API_BASE_URL } from '../../../config';


const GerenciarQuestoes = () => {
    const [temas, setTemas] = useState([]);
    const [questoes, setQuestoes] = useState([]);
    const [filtroTema, setFiltroTema] = useState('');
    const [filtroDificuldade, setFiltroDificuldade] = useState('');
    const [novaQuestao, setNovaQuestao] = useState({
        tema_id: '',
        enunciado: '',
        dificuldade: 'medio',
        alternativas: [
            { texto: '', correta: false },
            { texto: '', correta: false },
            { texto: '', correta: false },
            { texto: '', correta: false }
        ]
    });
    const [imagem, setImagem] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [excluindo, setExcluindo] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/professor/login');
            return;
        }

        const fetchData = async () => {
            try {
                const [temasRes, questoesRes] = await Promise.all([
                    axios.get(`${API_BASE_URL }/api/professor/temas`, {
                        headers: { Authorization: `Bearer ${token}` }
                    }),
                    axios.get(`${API_BASE_URL }/api/professor/questoes`, {
                        headers: { Authorization: `Bearer ${token}` },
                        params: {
                            tema_id: filtroTema || undefined,
                            dificuldade: filtroDificuldade || undefined
                        }
                    })
                ]);

                setTemas(temasRes.data);
                setQuestoes(questoesRes.data);
            } catch (error) {
                console.error(error);
            }
        };

        fetchData();
    }, [filtroTema, filtroDificuldade, navigate]);

    const handleAlternativaChange = (index, field, value) => {
        const updatedAlternativas = [...novaQuestao.alternativas];

        if (field === 'correta') {
            updatedAlternativas.forEach((alt, i) => {
                alt.correta = i === index;
            });
        } else {
            updatedAlternativas[index][field] = value;
        }

        setNovaQuestao({
            ...novaQuestao,
            alternativas: updatedAlternativas
        });
    };

    const handleAddAlternativa = () => {
        if (novaQuestao.alternativas.length < 8) {
            setNovaQuestao({
                ...novaQuestao,
                alternativas: [...novaQuestao.alternativas, { texto: '', correta: false }]
            });
        }
    };

    const handleRemoveAlternativa = (index) => {
        if (novaQuestao.alternativas.length > 4) {
            const updatedAlternativas = [...novaQuestao.alternativas];
            updatedAlternativas.splice(index, 1);

            setNovaQuestao({
                ...novaQuestao,
                alternativas: updatedAlternativas
            });
        }
    };

    const handleImagemChange = (e) => {
        setImagem(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');

        try {
            const formData = new FormData();
            formData.append('tema_id', novaQuestao.tema_id);
            formData.append('enunciado', novaQuestao.enunciado);
            formData.append('dificuldade', novaQuestao.dificuldade);
            formData.append('alternativas', JSON.stringify(novaQuestao.alternativas));
            if (imagem) formData.append('imagem', imagem);

            await axios.post(`${API_BASE_URL }/api/professor/questoes`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            const res = await axios.get(`${API_BASE_URL }/api/professor/questoes`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setQuestoes(res.data);

            setNovaQuestao({
                tema_id: '',
                enunciado: '',
                dificuldade: 'medio',
                alternativas: [
                    { texto: '', correta: false },
                    { texto: '', correta: false },
                    { texto: '', correta: false },
                    { texto: '', correta: false }
                ]
            });
            setImagem(null);
            setShowForm(false);
            alert('Questão criada com sucesso!');
        } catch (error) {
            console.error(error);
            alert('Erro ao criar questão: ' + (error.response?.data?.error || 'Erro no servidor'));
        }
    };

    const excluirQuestao = async (id) => {
        if (!window.confirm('Tem certeza que deseja excluir esta questão permanentemente?')) {
            return;
        }

        setExcluindo(id);
        try {
            await axios.delete(`${API_BASE_URL }/api/professor/questoes/${id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

            setQuestoes(questoes.filter(q => q.id !== id));
            alert('Questão excluída com sucesso!');
        } catch (error) {
            console.error(error);
            alert('Erro ao excluir questão: ' + (error.response?.data?.error || 'Erro no servidor'));
        } finally {
            setExcluindo(null);
        }
    };

    const excluirTema = async (id) => {
        if (!window.confirm('Tem certeza que deseja excluir este tema permanentemente?')) {
            return;
        }

        setExcluindo(id);
        try {
            const response = await axios.delete(`${API_BASE_URL }/api/professor/temas/${id}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.data.error && response.data.questoesAssociadas) {
                alert(`Não foi possível excluir. Existem questões associadas a este tema (IDs: ${response.data.questoesAssociadas.join(', ')})`);
                return;
            }

            setTemas(temas.filter(t => t.id !== id));
            setQuestoes(questoes.filter(q => q.tema_id !== id));

            alert('Tema excluído com sucesso!');
        } catch (error) {
            console.error(error);
            alert('Erro ao excluir tema: ' + (error.response?.data?.error || 'Erro no servidor'));
        } finally {
            setExcluindo(null);
        }
    };

    const getImageUrl = (imagem) => {
        if (!imagem) return null;
        if (imagem.startsWith('http')) return imagem;
        return `${API_BASE_URL }/uploads/${imagem}`;
    };

    return (
        <div className="gerenciar-questoes-container">
            <div className="header">
                <h1>Gerenciar Questões</h1>

                <div className="filtros">
                    <select
                        value={filtroTema}
                        onChange={(e) => setFiltroTema(e.target.value)}
                    >
                        <option value="">Todos os Temas</option>
                        {temas.map(tema => (
                            <option key={tema.id} value={tema.id}>{tema.nome}</option>
                        ))}
                    </select>

                    <select
                        value={filtroDificuldade}
                        onChange={(e) => setFiltroDificuldade(e.target.value)}
                    >
                        <option value="">Todas as Dificuldades</option>
                        <option value="facil">Fácil</option>
                        <option value="medio">Médio</option>
                        <option value="dificil">Difícil</option>
                    </select>

                    <button
                        onClick={() => setShowForm(!showForm)}
                        className="btn-nova"
                        disabled={excluindo}
                    >
                        {showForm ? 'Cancelar' : 'Nova Questão'}
                    </button>
                </div>
            </div>

            {showForm && (
                <div className="form-container">
                    <form onSubmit={handleSubmit} className="form-questao">
                        <div className="form-group">
                            <label>Tema:</label>
                            <select
                                value={novaQuestao.tema_id}
                                onChange={(e) => setNovaQuestao({ ...novaQuestao, tema_id: e.target.value })}
                                required
                                disabled={excluindo}
                            >
                                <option value="">Selecione um tema</option>
                                {temas.map(tema => (
                                    <option key={tema.id} value={tema.id}>{tema.nome}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Enunciado:</label>
                            <textarea
                                value={novaQuestao.enunciado}
                                onChange={(e) => setNovaQuestao({ ...novaQuestao, enunciado: e.target.value })}
                                required
                                disabled={excluindo}
                            />
                        </div>

                        <div className="form-group">
                            <label>Dificuldade:</label>
                            <select
                                value={novaQuestao.dificuldade}
                                onChange={(e) => setNovaQuestao({ ...novaQuestao, dificuldade: e.target.value })}
                                required
                                disabled={excluindo}
                            >
                                <option value="facil">Fácil</option>
                                <option value="medio">Médio</option>
                                <option value="dificil">Difícil</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Imagem (opcional):</label>
                            <input
                                type="file"
                                onChange={handleImagemChange}
                                accept="image/*"
                                disabled={excluindo}
                            />
                        </div>

                        <div className="alternativas">
                            <h3>Alternativas</h3>
                            <p>Marque a alternativa correta</p>

                            {novaQuestao.alternativas.map((alt, index) => (
                                <div key={index} className="alternativa">
                                    <input
                                        type="radio"
                                        name="correta"
                                        checked={alt.correta}
                                        onChange={() => handleAlternativaChange(index, 'correta', true)}
                                        disabled={excluindo}
                                    />
                                    <input
                                        type="text"
                                        value={alt.texto}
                                        onChange={(e) => handleAlternativaChange(index, 'texto', e.target.value)}
                                        placeholder={`Alternativa ${index + 1}`}
                                        required
                                        disabled={excluindo}
                                    />
                                    {novaQuestao.alternativas.length > 4 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveAlternativa(index)}
                                            className="btn-remove"
                                            disabled={excluindo}
                                        >
                                            Remover
                                        </button>
                                    )}
                                </div>
                            ))}

                            {novaQuestao.alternativas.length < 8 && (
                                <button
                                    type="button"
                                    onClick={handleAddAlternativa}
                                    className="btn-add"
                                    disabled={excluindo}
                                >
                                    Adicionar Alternativa
                                </button>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="btn-submit"
                            disabled={excluindo}
                        >
                            {excluindo ? 'Processando...' : 'Salvar Questão'}
                        </button>
                    </form>
                </div>
            )}

            <div className="questoes-table-container">
                <div className="tabs">
                    <button className="active">Questões</button>
                    <button>Temas</button>
                </div>

                <table className="questoes-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Enunciado</th>
                            <th>Tema</th>
                            <th>Dificuldade</th>
                            <th className="acoes-cell">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {questoes.map(questao => (
                            <tr key={questao.id}>
                                <td>{questao.id}</td>
                                <td className="enunciado-cell">
                                    {questao.enunciado.length > 50
                                        ? `${questao.enunciado.substring(0, 50)}...`
                                        : questao.enunciado}
                                    {questao.imagem && (
                                        <span className="imagem-indicator">[Imagem]</span>
                                    )}
                                </td>
                                <td>{questao.tema_nome || 'Sem tema'}</td>
                                <td>
                                    <span className={`dificuldade-badge ${questao.dificuldade}`}>
                                        {questao.dificuldade}
                                    </span>
                                </td>
                                <td className="acoes-cell">
                                    <button className="btn btn-editar">Editar</button>
                                    <button
                                        className="btn btn-excluir"
                                        onClick={() => excluirQuestao(questao.id)}
                                        disabled={excluindo === questao.id}
                                    >
                                        {excluindo === questao.id ? 'Excluindo...' : 'Excluir'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default GerenciarQuestoes;