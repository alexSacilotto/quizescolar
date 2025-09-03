import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './LoginProfessor.css';
import { API_BASE_URL } from '../../../config';

const LoginProfessor = () => {
    const [login, setLogin] = useState('');
    const [senha, setSenha] = useState('');
    const [erro, setErro] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setErro('');

        try {
            const response = await axios.post(`${API_BASE_URL }/api/login`, {
                login,
                senha
            });

            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            navigate('/professor/dashboard');
        } catch (error) {
            setErro('Credenciais inválidas. Tente novamente.');
            console.error(error);
        }
    };

    return (
        <div className="login-container" style={{ backgroundColor: 'white' }}>
            <div className="login-box" style={{ backgroundColor: '#e8f5e9' }}>
                <h2>Login do Professor</h2>
                {erro && <p className="error">{erro}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Login:</label>
                        <input
                            type="text"
                            value={login}
                            onChange={(e) => setLogin(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Senha:</label>
                        <input
                            type="password"
                            value={senha}
                            onChange={(e) => setSenha(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit">Entrar</button>
                </form>
                <div className="login-info">
                    <p><strong>Obrigatório o Preenchimento</strong></p>
                    <p><strong>Do login e senha</strong></p>
                </div>
            </div>
        </div>
    );
};

export default LoginProfessor;