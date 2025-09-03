import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginProfessor from './frontend-react/pages/Professor/LoginProfessor';
import DashboardProfessor from './frontend-react/pages/Professor/DashboardProfessor';
import GerenciarQuestoes from './frontend-react/pages/Professor/GerenciarQuestoes';
import CriarTeste from './frontend-react/pages/Professor/CriarTeste';
import ResultadosTeste from './frontend-react/pages/Professor/ResultadosTeste';
import CadastroTemas from './frontend-react/pages/Professor/CadastroTemas';
import IdentificacaoAluno from './frontend-react/pages/Estudante/IdentificacaoAluno';
import ListaTestesProfessor from './frontend-react/pages/Professor/ListaTestesProfessor'; // Novo componente
import ListaTestes from './frontend-react/pages/Estudante/ListaTestes'
import RealizarTeste from './frontend-react/pages/Estudante/RealizarTeste';
import ResultadoAluno from './frontend-react/pages/Estudante/ResultadoAluno';
import Home from './frontend-react/Home/Home';
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
                <Route path="/professor/temas" element={<CadastroTemas />} />

                {/* Rotas do Estudante */}
                <Route path="/estudante/identificar" element={<IdentificacaoAluno />} />
                <Route path="/estudante/testes" element={<ListaTestes />} />
                <Route path="/estudante/testes/:id" element={<RealizarTeste />} />
                <Route path="/estudante/testes/:id/resultado" element={<ResultadoAluno />} />

                {/* Rota padrao */}
                <Route path="/" element={<Home />} />
            </Routes>
        </Router>
    );
}

export default App;