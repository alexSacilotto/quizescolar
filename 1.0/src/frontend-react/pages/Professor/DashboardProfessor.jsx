import React from 'react';
import { useNavigate } from 'react-router-dom';
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText as GSAPSplitText } from "gsap/SplitText";
gsap.registerPlugin(ScrollTrigger, GSAPSplitText);
import './DashboardProfessor.css';
import { API_BASE_URL } from '../../../config';


const handleAnimationComplete = () => {
    console.log('All letters have animated!');
};
const DashboardProfessor = () => {
    const navigate = useNavigate();
    return (
        <div className="dashboard-professor" style={{ backgroundColor: 'white' }}>
            <h1>Dashboard do Professor</h1>
            <div className="dashboard-actions">
                <div className="action-card" onClick={() => navigate('/professor/questoes')}>
                    <h2>Gerenciar Questões</h2>
                    <p>Crie e edite questões para seus testes</p>
                </div>

                <div className="action-card" onClick={() => navigate('/professor/testes/novo')}>
                    <h2>Criar Teste</h2>
                    <p>Monte um novo teste para seus alunos</p>
                </div>

                <div className="action-card" onClick={() => navigate('/professor/testes')}>
                    <h2>Ver Testes</h2>
                    <p>Visualize e acompanhe os testes criados</p>
                </div>

                <div className="action-card" onClick={() => navigate('/professor/temas')}>
                    <h2>Gerenciar Temas</h2>
                    <p>Cadastre e edite os temas para as questões</p>
                </div>

            </div>
        </div>
    );
};

export default DashboardProfessor;