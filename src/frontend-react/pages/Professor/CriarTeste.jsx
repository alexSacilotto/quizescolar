import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './CriarTeste.css';
import { API_BASE_URL } from '../../../config';

const CriarTeste = () => {
    const [temas, setTemas] = useState([]);
    const [tempoLimiteHabilitado, setTempoLimiteHabilitado] = useState(false);
    const [questoesDisponiveis, setQuestoesDisponiveis] = useState([]);
    const [teste, setTeste] = useState({
        titulo: '',
        tema_id: '',
        dificuldade: '',
        quantidade_questoes: 10,
        questoes: []
    });
    const [filtroQuestoes, setFiltroQuestoes] = useState({
        tema_id: '',
        dificuldade: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/professor/login');
            return;
        }

        const fetchData = async () => {
            try {
                const [temasRes] = await Promise.all([
                    axios.get(`${API_BASE_URL }/api/professor/temas`, {
                        headers: { Authorization: `Bearer ${token}` }
                    })
                ]);

                setTemas(temasRes.data);
            } catch (error) {
                console.error(error);
                setError('Erro ao carregar temas');
            }
        };

        fetchData();
    }, [navigate]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) return;

        const fetchQuestoes = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL }/api/professor/questoes`, {
                    headers: { Authorization: `Bearer ${token}` },
                    params: {
                        tema_id: filtroQuestoes.tema_id || undefined,
                        dificuldade: filtroQuestoes.dificuldade || undefined
                    }
                });

                setQuestoesDisponiveis(res.data);
            } catch (error) {
                console.error(error);
                setError('Erro ao carregar questões');
            }
        };

        fetchQuestoes();
    }, [filtroQuestoes]);

    const handleTesteChange = (e) => {
        const { name, value } = e.target;
        setTeste({
            ...teste,
            [name]: value
        });
    };

    const handleFiltroChange = (e) => {
        const { name, value } = e.target;
        setFiltroQuestoes({
            ...filtroQuestoes,
            [name]: value
        });
    };

    const toggleQuestao = (questaoId) => {
        setTeste(prev => {
            if (prev.questoes.includes(questaoId)) {
                return {
                    ...prev,
                    questoes: prev.questoes.filter(id => id !== questaoId)
                };
            } else {
                return {
                    ...prev,
                    questoes: [...prev.questoes, questaoId]
                };
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        setLoading(true);
        setError(null);

        try {
            const response = await axios.post(`${API_BASE_URL }/api/professor/testes`, {
                titulo: teste.titulo,
                tema_id: teste.tema_id || null,
                dificuldade: teste.dificuldade || null,
                quantidade_questoes: teste.quantidade_questoes,
                questoes: teste.questoes.length > 0 ? teste.questoes : undefined
            }, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data && response.data.id) {
                alert(`Teste criado com sucesso! ID: ${response.data.id}`);
                navigate('/professor/dashboard');
            } else {
                throw new Error('Resposta inesperada do servidor');
            }
        } catch (error) {
            console.error('Erro detalhado:', error);
            setError(error.response?.data?.error || error.message || 'Erro ao criar teste');
        } finally {
            setLoading(false);
        }
    };

    if (error) {
        return (
            <div className="criar-teste">
                <h1>Erro</h1>
                <p>{error}</p>
                <button onClick={() => window.location.reload()}>Tentar novamente</button>
            </div>
        );
    }

    return (
        <div className="criar-teste" style={{ backgroundColor: 'white' }}>
            <h1>Criar Novo Teste</h1>

            <form onSubmit={handleSubmit} className="form-teste">
                <div className="form-group">
                    <label>Título do Teste:</label>
                    <input
                        type="text"
                        name="titulo"
                        value={teste.titulo}
                        onChange={handleTesteChange}
                        required
                        disabled={loading}
                    />
                </div>

                <div className="form-group">
                    <label>
                        <input
                            type="checkbox"
                            checked={tempoLimiteHabilitado}
                            onChange={() => setTempoLimiteHabilitado(!tempoLimiteHabilitado)}
                        />
                        Definir tempo limite para a prova
                    </label>
                    {tempoLimiteHabilitado && (
                        <div style={{ marginTop: '10px' }}>
                            <label>Tempo máximo (minutos):</label>
                            <input
                                type="number"
                                name="tempo_limite"
                                value={teste.tempo_limite || ''}
                                onChange={handleTesteChange}
                                min="1"
                                max="180"
                                required
                            />
                        </div>
                    )}
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label>Tema (opcional):</label>
                        <select
                            name="tema_id"
                            value={teste.tema_id}
                            onChange={handleTesteChange}
                            disabled={loading}
                        >
                            <option value="">Selecione um tema</option>
                            {temas.map(tema => (
                                <option key={tema.id} value={tema.id}>{tema.nome}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Dificuldade (opcional):</label>
                        <select
                            name="dificuldade"
                            value={teste.dificuldade}
                            onChange={handleTesteChange}
                            disabled={loading}
                        >
                            <option value="">Qualquer dificuldade</option>
                            <option value="facil">Fácil</option>
                            <option value="medio">Médio</option>
                            <option value="dificil">Difícil</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Número de Questões:</label>
                        <input
                            type="number"
                            name="quantidade_questoes"
                            value={teste.quantidade_questoes}
                            onChange={handleTesteChange}
                            min="1"
                            max="50"
                            disabled={teste.questoes.length > 0 || loading}
                        />
                    </div>
                </div>

                <div className="selecao-questoes">
                    <h2>Seleção de Questões</h2>
                    <p>
                        {teste.questoes.length > 0 ? (
                            `Você selecionou ${teste.questoes.length} questões específicas.`
                        ) : (
                            `Serão selecionadas ${teste.quantidade_questoes} questões aleatórias com os filtros acima.`
                        )}
                    </p>

                    <div className="filtros-questoes">
                        <h3>Filtrar Questões</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Tema:</label>
                                <select
                                    name="tema_id"
                                    value={filtroQuestoes.tema_id}
                                    onChange={handleFiltroChange}
                                    disabled={loading}
                                >
                                    <option value="">Todos os Temas</option>
                                    {temas.map(tema => (
                                        <option key={tema.id} value={tema.id}>{tema.nome}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Dificuldade:</label>
                                <select
                                    name="dificuldade"
                                    value={filtroQuestoes.dificuldade}
                                    onChange={handleFiltroChange}
                                    disabled={loading}
                                >
                                    <option value="">Todas as Dificuldades</option>
                                    <option value="facil">Fácil</option>
                                    <option value="medio">Médio</option>
                                    <option value="dificil">Difícil</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="lista-questoes">
                        {questoesDisponiveis.map(questao => (
                            <div
                                key={questao.id}
                                className={`questao-item ${teste.questoes.includes(questao.id) ? 'selecionada' : ''}`}
                                onClick={() => !loading && toggleQuestao(questao.id)}
                            >
                                <div className="questao-info">
                                    <span className="tema">{questao.tema_nome}</span>
                                    <span className={`dificuldade ${questao.dificuldade}`}>
                                        {questao.dificuldade}
                                    </span>
                                </div>
                                <p>{questao.enunciado}</p>
                                <div className="alternativas-preview">
                                    {questao.alternativas.slice(0, 3).map((alt, idx) => (
                                        <span key={idx}>{String.fromCharCode(65 + idx)}. {alt.texto.slice(0, 20)}...</span>
                                    ))}
                                    {questao.alternativas.length > 3 && <span>...</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <button
                    type="submit"
                    className="btn-submit"
                    disabled={loading}
                >
                    {loading ? 'Criando Teste...' : 'Criar Teste'}
                </button>
            </form>
        </div>
    );
};

export default CriarTeste;