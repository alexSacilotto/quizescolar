import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      <div className="home-header">
        <h1>Quiz Escolar</h1>
        <p>Selecione seu perfil para continuar</p>
      </div>
      
      <div className="home-options">
        <div className="option-card professor" onClick={() => navigate('/professor/login')}>
          <div className="option-icon">
            <i className="fas fa-chalkboard-teacher"></i>
          </div>
          <h2>Professor</h2>
          <p>Acesse o painel de controle para criar e gerenciar quizzes</p>
          <button className="btn-access">Acessar</button>
        </div>
        
        <div className="option-card student" onClick={() => navigate('/estudante/identificar')}>
          <div className="option-icon">
            <i className="fas fa-user-graduate"></i>
          </div>
          <h2>Aluno</h2>
          <p>Realize os quizzes disponíveis e teste seus conhecimentos</p>
          <button className="btn-access">Acessar</button>
        </div>
      </div>
    </div>
  );
};

export default Home;