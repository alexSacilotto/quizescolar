import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './RealizarTeste.css';
import { API_BASE_URL } from '../../../config';

const RealizarTeste = () => {
    const { id } = useParams();
    const [teste, setTeste] = useState(null);
    const [respostas, setRespostas] = useState({});
    const [questaoAtual, setQuestaoAtual] = useState(0);
    const [tempoRestante, setTempoRestante] = useState(null);
    const [tempoDecorrido, setTempoDecorrido] = useState(0);
    const [tempoEsgotado, setTempoEsgotado] = useState(false);
    const [revisao, setRevisao] = useState(false);
    const [enviado, setEnviado] = useState(false);
    const [resultado, setResultado] = useState(null);
    const [testesRealizados, setTestesRealizados] = useState([]);
    const timerRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        const aluno = localStorage.getItem('aluno');
        if (!aluno) {
            navigate('/estudante/identificar');
            return;
        }

        const fetchData = async () => {
            try {
                // Carrega o teste atual
                const [testeRes, realizadosRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/api/estudante/testes/${id}`),
                    axios.get(`${API_BASE_URL}/api/estudante/testes-realizados`, {
                        params: { aluno_id: JSON.parse(aluno).id }
                    })
                ]);

                setTeste(testeRes.data);
                setTestesRealizados(realizadosRes.data);

                // Inicializar respostas vazias
                const respostasIniciais = {};
                testeRes.data.questoes.forEach(q => {
                    respostasIniciais[q.id] = null;
                });
                setRespostas(respostasIniciais);

                // Configurar tempo se houver tempo máximo definido
                if (testeRes.data.teste.tempo_maximo) {
                    setTempoRestante(testeRes.data.teste.tempo_maximo * 60); // converter minutos para segundos
                }
            } catch (error) {
                console.error(error);
                navigate('/estudante/testes');
            }
        };

        fetchData();

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [id, navigate]);

    useEffect(() => {
        if (tempoRestante !== null) {
            // Modo regressivo (tempo máximo definido)
            timerRef.current = setInterval(() => {
                setTempoRestante(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        setTempoEsgotado(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            // Modo progressivo (sem tempo máximo)
            timerRef.current = setInterval(() => {
                setTempoDecorrido(prev => prev + 1);
            }, 1000);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [tempoRestante]);

    const handleResposta = (questaoId, alternativaId) => {
        if (!tempoEsgotado) {
            setRespostas(prev => ({
                ...prev,
                [questaoId]: alternativaId
            }));
        }
    };

    const proximaQuestao = () => {
        if (questaoAtual < teste.questoes.length - 1) {
            setQuestaoAtual(questaoAtual + 1);
        }
    };

    const questaoAnterior = () => {
        if (questaoAtual > 0) {
            setQuestaoAtual(questaoAtual - 1);
        }
    };

    const formatarTempo = (segundos) => {
        const mins = Math.floor(segundos / 60);
        const secs = segundos % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleEnviar = async () => {
        const aluno = JSON.parse(localStorage.getItem('aluno'));

        try {
            // Preparar respostas para enviar
            const respostasArray = [];

            for (const questao of teste.questoes) {
                if (respostas[questao.id] !== null) {
                    const alternativaCorreta = questao.alternativas.find(a => a.correta).id;

                    respostasArray.push({
                        questao_id: questao.id,
                        alternativa_id: respostas[questao.id],
                        correta: respostas[questao.id] === alternativaCorreta
                    });
                }
            }

            // Enviar respostas
            const res = await axios.post(`${API_BASE_URL}/api/estudante/testes/${id}/respostas`, {
                aluno_id: aluno.id,
                respostas: respostasArray,
                tempo_gasto: tempoRestante !== null ?
                    (teste.teste.tempo_maximo * 60 - tempoRestante) :
                    tempoDecorrido
            });

            setResultado(res.data);
            setEnviado(true);

            // Atualizar lista de testes realizados
            const realizadosRes = await axios.get(`${API_BASE_URL}/api/estudante/testes-realizados`, {
                params: { aluno_id: aluno.id }
            });
            setTestesRealizados(realizadosRes.data);
        } catch (error) {
            console.error(error);
        }
    };

    const getImageUrl = (imagem) => {
        if (imagem.startsWith('http')) {
            return imagem;
        }
        return `${API_BASE_URL}/uploads/${imagem}`;
    };

    if (!teste) {
        return <div className="loading">Carregando teste...</div>;
    }

    if (enviado && resultado) {
        return (
            <div className="resultado-teste" style={{ backgroundColor: '#1976d2', color: 'white' }}>
                <h1>Teste Concluído!</h1>
                <div className="resultado-info">
                    <p>Você acertou <strong>{resultado.acertos}</strong> de <strong>{resultado.total}</strong> questões.</p>
                    <p>Sua porcentagem de acertos: <strong>{resultado.porcentagem}%</strong></p>
                    <p>Tempo utilizado: <strong>{formatarTempo(resultado.tempo_gasto)}</strong></p>
                </div>

                <div className="testes-realizados">
                    <h3>Testes que você já realizou:</h3>
                    <ul>
                        {testesRealizados.map((teste, index) => (
                            <li key={index}>
                                <strong>{teste.titulo}</strong> - {teste.porcentagem}% de acertos
                            </li>
                        ))}
                    </ul>
                </div>

                <button onClick={() => navigate('/estudante/testes')} className="btn-voltar">
                    Voltar para Lista de Testes
                </button>
            </div>
        );
    }

    const questao = teste.questoes[questaoAtual];

    return (
        <div className="realizar-teste" style={{ backgroundColor: '#1976d2', color: 'white' }}>
            <div className="teste-header">
                <h1>{teste.teste.titulo}</h1>
                <div className="teste-info">
                    <span className={tempoEsgotado ? 'tempo-esgotado' : ''}>
                        {tempoRestante !== null ?
                            `Tempo restante: ${formatarTempo(tempoRestante)}` :
                            `Tempo: ${formatarTempo(tempoDecorrido)}`}
                        {tempoEsgotado && <span className="aviso-esgotado"> (Tempo esgotado!)</span>}
                    </span>
                    <span>Questão {questaoAtual + 1} de {teste.questoes.length}</span>
                </div>
            </div>

            {tempoEsgotado && (
                <div className="aviso-tempo">
                    <p>O tempo acabou! Você só pode enviar o teste agora.</p>
                </div>
            )}

            <div className="questao-container">
                <div className="questao">
                    <h2>{questao.enunciado}</h2>
                    {questao.imagem && (
                        <div className="imagem-questao">
                            <img
                                src={getImageUrl(questao.imagem)}
                                alt="Ilustração da questão"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    const container = e.target.parentElement;
                                    if (container) {
                                        container.innerHTML = '<p class="imagem-error">Imagem não disponível</p>';
                                    }
                                }}
                            />
                        </div>
                    )}

                    <div className="alternativas">
                        {questao.alternativas.map((alternativa, idx) => (
                            <div
                                key={alternativa.id}
                                className={`alternativa ${respostas[questao.id] === alternativa.id ? 'selecionada' : ''}`}
                                onClick={() => !tempoEsgotado && handleResposta(questao.id, alternativa.id)}
                                style={tempoEsgotado ? { pointerEvents: 'none', opacity: 0.7 } : {}}
                            >
                                <span className="letra-alternativa">{String.fromCharCode(65 + idx)}</span>
                                <span className="texto-alternativa">{alternativa.texto}</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="navegacao">
                    <button
                        onClick={questaoAnterior}
                        disabled={questaoAtual === 0 || tempoEsgotado}
                    >
                        Anterior
                    </button>

                    {questaoAtual < teste.questoes.length - 1 ? (
                        <button
                            onClick={proximaQuestao}
                            disabled={tempoEsgotado}
                        >
                            Próxima
                        </button>
                    ) : (
                        <button
                            onClick={() => setRevisao(true)}
                            className="btn-revisar"
                            disabled={tempoEsgotado}
                        >
                            Revisar Teste
                        </button>
                    )}
                </div>
            </div>

            {(revisao || tempoEsgotado) && (
                <div className="modal-revisao">
                    <div className="revisao-content">
                        <h2>{tempoEsgotado ? 'Tempo Esgotado' : 'Revisão do Teste'}</h2>
                        <p>{tempoEsgotado ?
                            'O tempo acabou. Por favor, envie seu teste.' :
                            'Revise suas respostas antes de enviar:'}</p>

                        <div className="resumo-questoes">
                            {teste.questoes.map((q, idx) => (
                                <div
                                    key={q.id}
                                    className={`resumo-questao ${respostas[q.id] !== null ? 'respondida' : 'nao-respondida'}`}
                                    onClick={() => {
                                        if (!tempoEsgotado) {
                                            setQuestaoAtual(idx);
                                            setRevisao(false);
                                        }
                                    }}
                                    style={tempoEsgotado ? { pointerEvents: 'none' } : {}}
                                >
                                    <span>Questão {idx + 1}</span>
                                    <span>{respostas[q.id] !== null ? 'Respondida' : 'Não respondida'}</span>
                                </div>
                            ))}
                        </div>

                        <div className="revisao-botoes">
                            {!tempoEsgotado && (
                                <button onClick={() => setRevisao(false)}>Continuar Respondendo</button>
                            )}
                            <button
                                onClick={handleEnviar}
                                className="btn-enviar"
                            >
                                {tempoEsgotado ? 'Enviar Teste Agora' : 'Enviar Teste'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RealizarTeste;