import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import './ResultadosTeste.css';
import { API_BASE_URL } from '../../../config';

const ResultadosTeste = () => {
    const { id } = useParams();
    const [resultados, setResultados] = useState({
        teste: {},
        alunos: [],
        questoes: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            navigate('/professor/login');
            return;
        }

        const fetchResultados = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL }/api/professor/testes/${id}/resultados`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                // Verifica se a resposta tem a estrutura esperada
                if (res.data && res.data.teste && (res.data.alunos || res.data.resultados) && (res.data.questoes || res.data.estatisticasQuestoes)) {
                    setResultados({
                        teste: res.data.teste || {},
                        alunos: res.data.alunos || res.data.resultados || [],
                        questoes: res.data.questoes || res.data.estatisticasQuestoes || []
                    });
                } else {
                    throw new Error('Estrutura de dados inesperada');
                }
                setLoading(false);
            } catch (error) {
                console.error('Erro ao buscar resultados:', error);
                setError(error.message);
                setLoading(false);
            }
        };

        fetchResultados();
    }, [id, navigate]);

    const handleDownloadExcel = async () => {
        const token = localStorage.getItem('token');

        try {
            const response = await axios.get(`${API_BASE_URL }/api/professor/testes/${id}/resultados/excel`, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `resultados-teste-${id}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Erro ao exportar para Excel:', error);
            setError('Erro ao exportar para Excel');
        }
    };

    if (loading) {
        return <div className="loading">Carregando resultados...</div>;
    }

    if (error) {
        return <div className="error">Erro: {error}</div>;
    }

    return (
        <div className="resultados-teste" style={{ backgroundColor: 'white' }}>
            <h1>Resultados do Teste: {resultados.teste.titulo || 'Sem título'}</h1>
            <p>Tema: {resultados.teste.tema || 'Múltiplos temas'}</p>

            <button onClick={handleDownloadExcel} className="btn-excel">
                Exportar para Excel
            </button>

            <div className="resultados-gerais">
                <h2>Desempenho dos Alunos</h2>
                {resultados.alunos.length > 0 ? (
                    <table>
                        <thead>
                            <tr>
                                <th>Aluno</th>
                                <th>Número</th>
                                <th>Acertos</th>
                                <th>Total</th>
                                <th>Porcentagem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {resultados.alunos.map((aluno, idx) => (
                                <tr key={idx}>
                                    <td>{aluno.aluno?.nome || aluno.nome || 'N/A'}</td>
                                    <td>{aluno.aluno?.numero || aluno.numero || 'N/A'}</td>
                                    <td>{aluno.acertos || 0}</td>
                                    <td>{aluno.total_questoes || aluno.totalQuestoes || 0}</td>
                                    <td>{aluno.porcentagem || '0'}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p>Nenhum aluno completou este teste ainda.</p>
                )}
            </div>

            <div className="estatisticas-questoes">
                <h2>Estatísticas por Questão</h2>
                {resultados.questoes.length > 0 ? (
                    <table>
                        <thead>
                            <tr>
                                <th>Questão</th>
                                <th>Total Respostas</th>
                                <th>Acertos</th>
                                <th>Porcentagem de Acertos</th>
                            </tr>
                        </thead>
                        <tbody>
                            {resultados.questoes.map((questao, idx) => (
                                <tr key={idx}>
                                    <td className="enunciado">
                                        <strong>Q{idx + 1}:</strong> {questao.questao?.enunciado || questao.enunciado || 'N/A'}
                                    </td>
                                    <td>{questao.total_respostas || questao.totalRespostas || 0}</td>
                                    <td>{questao.acertos || 0}</td>
                                    <td>{questao.porcentagem || '0'}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p>Não há estatísticas disponíveis para as questões.</p>
                )}
            </div>
        </div>
    );
};

export default ResultadosTeste;