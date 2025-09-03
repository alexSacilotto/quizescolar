import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginProfessor from './pages/Professor/LoginProfessor';
import DashboardProfessor from './pages/Professor/DashboardProfessor';
import GerenciarQuestoes from './pages/Professor/GerenciarQuestoes';
import CriarTeste from './pages/Professor/CriarTeste';
import ResultadosTeste from './pages/Professor/ResultadosTeste';
import ListaTestesProfessor from './pages/Professor/ListaTestesProfessor'; // Novo componente
import IdentificacaoAluno from './pages/Estudante/IdentificacaoAluno';
import ListaTestes from './pages/Estudante/ListaTestes';
import RealizarTeste from './pages/Estudante/RealizarTeste';
import ResultadoAluno from './pages/Estudante/ResultadoAluno';
import './index.css';

function App() {
    return (
        <Router>
            <Routes>
                {/* Rotas do Professor */}
                <Route path="/professor/login" element={<LoginProfessor />} />
                <Route path="/professor/dashboard" element={<DashboardProfessor />} />
                <Route path="/professor/questoes" element={<GerenciarQuestoes />} />
                <Route path="/professor/testes" element={<ListaTestesProfessor />} /> {/* Rota adicionada */}
                <Route path="/professor/testes/novo" element={<CriarTeste />} />
                <Route path="/professor/testes/:id/resultados" element={<ResultadosTeste />} />

                {/* Rotas do Estudante */}
                <Route path="/estudante/identificar" element={<IdentificacaoAluno />} />
                <Route path="/estudante/testes" element={<ListaTestes />} />
                <Route path="/estudante/testes/:id" element={<RealizarTeste />} />
                <Route path="/estudante/testes/:id/resultado" element={<ResultadoAluno />} />

                {/* Rota padrão */}
                <Route path="/" element={<Navigate to="/professor/login" />} />
            </Routes>
        </Router>
    );
}

export default App;