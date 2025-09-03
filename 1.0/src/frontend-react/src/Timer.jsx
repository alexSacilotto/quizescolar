import React, { useState, useEffect } from 'react';

const Timer = ({ tempoLimite, onTimeUp }) => {
    const [tempoRestante, setTempoRestante] = useState(tempoLimite * 60); // em segundos
    const [tempoDecorrido, setTempoDecorrido] = useState(0); // em segundos

    useEffect(() => {
        let timer;

        if (tempoLimite) {
            // Modo regressivo
            timer = setInterval(() => {
                setTempoRestante(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        onTimeUp();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            // Modo progressivo
            timer = setInterval(() => {
                setTempoDecorrido(prev => prev + 1);
            }, 1000);
        }

        return () => clearInterval(timer);
    }, [tempoLimite, onTimeUp]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`timer ${tempoLimite ? 'regressivo' : 'progressivo'}`}>
            {tempoLimite ? (
                <>
                    <span>Tempo restante: </span>
                    <span className="time">{formatTime(tempoRestante)}</span>
                </>
            ) : (
                <>
                    <span>Tempo decorrido: </span>
                    <span className="time">{formatTime(tempoDecorrido)}</span>
                </>
            )}
        </div>
    );
};

export default Timer;