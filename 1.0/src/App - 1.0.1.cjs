const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const xlsx = require('xlsx');
const path = require('path');
const multer = require('multer');

const app = express();
const port = 3001;

// Configuração do banco de dados
const dbConfig = {
    host: 'localhost',
    user: 'quiz_app',
    password: 'ShowCiencia123',
    database: 'quiz_escolar'
};

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static('uploads'));

// Configuração do Multer para upload de imagens
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// Conexão com o banco de dados
let pool;
async function initDb() {
    pool = await mysql.createPool(dbConfig);
}
initDb();

// Autenticação
const secretKey = '1789e3eb833e28a866ad8c593dc72e69eb5610cd857dbad012bbb5dbf3a5e578';

// Rotas
app.post('/api/login', async (req, res) => {
    const { login, senha } = req.body;

    try {
        const [rows] = await pool.query('SELECT * FROM usuarios WHERE login = ?', [login]);
        if (rows.length === 0) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const user = rows[0];
        const match = await bcrypt.compare(senha, user.senha);

        if (!match) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const token = jwt.sign({ id: user.id, login: user.login }, secretKey, { expiresIn: '1h' });
        res.json({ token, user: { id: user.id, nome: user.nome, login: user.login } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

// Middleware de autenticação
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, secretKey, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}

// Rotas protegidas
app.get('/api/professor/temas', /*authenticateToken,*/ async (req, res) => {
    try {
        const [temas] = await pool.query('SELECT * FROM temas');
        res.json(temas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar temas' });
    }
});

app.post('/api/professor/temas', authenticateToken, async (req, res) => {
    const { nome, descricao } = req.body;

    try {
        const [result] = await pool.query('INSERT INTO temas (nome, descricao) VALUES (?, ?)', [nome, descricao]);
        res.status(201).json({ id: result.insertId, nome, descricao });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar tema' });
    }
});

app.post('/api/professor/questoes', upload.single('imagem'), authenticateToken, async (req, res) => {
    const { tema_id, enunciado, dificuldade, alternativas } = req.body;
    const imagem = req.file ? req.file.filename : null;

    try {
        // Inserir questão
        const [questaoResult] = await pool.query(
            'INSERT INTO questoes (tema_id, enunciado, imagem, dificuldade) VALUES (?, ?, ?, ?)',
            [tema_id, enunciado, imagem, dificuldade]
        );

        const questaoId = questaoResult.insertId;

        // Inserir alternativas
        for (const alt of JSON.parse(alternativas)) {
            await pool.query(
                'INSERT INTO alternativas (questao_id, texto, correta) VALUES (?, ?, ?)',
                [questaoId, alt.texto, alt.correta]
            );
        }

        res.status(201).json({ id: questaoId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar questão' });
    }
});

app.get('/api/professor/questoes', authenticateToken, async (req, res) => {
    const { tema_id, dificuldade } = req.query;

    let query = 'SELECT q.*, t.nome as tema_nome FROM questoes q JOIN temas t ON q.tema_id = t.id';
    const params = [];

    if (tema_id) {
        query += ' WHERE q.tema_id = ?';
        params.push(tema_id);
    }

    if (dificuldade) {
        query += params.length ? ' AND' : ' WHERE';
        query += ' q.dificuldade = ?';
        params.push(dificuldade);
    }

    try {
        const [questoes] = await pool.query(query, params);

        // Buscar alternativas para cada questão
        for (const questao of questoes) {
            const [alternativas] = await pool.query('SELECT * FROM alternativas WHERE questao_id = ?', [questao.id]);
            questao.alternativas = alternativas;
        }

        res.json(questoes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar questões' });
    }
});

app.post('/api/professor/testes', authenticateToken, async (req, res) => {
    const { titulo, tema_id, dificuldade, quantidade_questoes, questoes } = req.body;
    const usuario_id = req.user.id;

    try {
        // Criar teste
        const [testeResult] = await pool.query(
            'INSERT INTO testes (usuario_id, titulo, tema_id, dificuldade, quantidade_questoes) VALUES (?, ?, ?, ?, ?)',
            [usuario_id, titulo, tema_id || null, dificuldade || null, quantidade_questoes || 10]
        );

        const testeId = testeResult.insertId;

        // Adicionar questões ao teste
        if (questoes && questoes.length > 0) {
            for (const questaoId of questoes) {
                await pool.query('INSERT INTO teste_questoes (teste_id, questao_id) VALUES (?, ?)', [testeId, questaoId]);
            }
        }

        res.status(201).json({ id: testeId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao criar teste' });
    }
});

app.get('/api/professor/testes', authenticateToken, async (req, res) => {
    const usuario_id = req.user.id;

    try {
        const [testes] = await pool.query(
            'SELECT t.*, tm.nome as tema_nome FROM testes t LEFT JOIN temas tm ON t.tema_id = tm.id WHERE t.usuario_id = ?',
            [usuario_id]
        );
        res.json(testes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar testes' });
    }
});

app.get('/api/professor/testes/:id/resultados', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        // Obter estatísticas gerais
        const [teste] = await pool.query('SELECT * FROM testes WHERE id = ?', [id]);
        if (teste.length === 0) return res.status(404).json({ error: 'Teste não encontrado' });

        // Obter todas as questões do teste
        const [questoes] = await pool.query(
            'SELECT q.id, q.enunciado FROM teste_questoes tq JOIN questoes q ON tq.questao_id = q.id WHERE tq.testee_id = ?',
            [id]
        );

        // Obter todos os alunos que responderam o teste
        const [alunos] = await pool.query(
            'SELECT DISTINCT a.id, a.nome, a.numero FROM respostas r JOIN alunos a ON r.aluno_id = a.id WHERE r.testee_id = ?',
            [id]
        );

        // Calcular estatísticas
        const resultados = [];
        const estatisticasQuestoes = [];

        for (const aluno of alunos) {
            // Respostas do aluno
            const [respostas] = await pool.query(
                'SELECT r.questao_id, r.correta FROM respostas r WHERE r.testee_id = ? AND r.aluno_id = ?',
                [id, aluno.id]
            );

            const totalQuestoes = questoes.length;
            const acertos = respostas.filter(r => r.correta).length;
            const porcentagem = (acertos / totalQuestoes) * 100;

            resultados.push({
                aluno: { id: aluno.id, nome: aluno.nome, numero: aluno.numero },
                acertos,
                totalQuestoes,
                porcentagem: porcentagem.toFixed(2)
            });
        }

        // Estatísticas por questão
        for (const questao of questoes) {
            const [respostas] = await pool.query(
                'SELECT COUNT(*) as total, SUM(correta) as acertos FROM respostas WHERE testee_id = ? AND questao_id = ?',
                [id, questao.id]
            );

            const total = respostas[0].total;
            const acertos = respostas[0].acertos;
            const porcentagem = total > 0 ? (acertos / total) * 100 : 0;

            estatisticasQuestoes.push({
                questao: { id: questao.id, enunciado: questao.enunciado },
                totalRespostas: total,
                acertos,
                porcentagem: porcentagem.toFixed(2)
            });
        }

        res.json({
            teste: teste[0],
            resultados,
            estatisticasQuestoes
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar resultados' });
    }
});

app.get('/api/professor/testes/:id/resultados/excel', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        // Obter dados para o Excel
        const [teste] = await pool.query('SELECT * FROM testes WHERE id = ?', [id]);
        if (teste.length === 0) return res.status(404).json({ error: 'Teste não encontrado' });

        // Obter resultados dos alunos
        const [alunos] = await pool.query(
            `SELECT a.id, a.nome, a.numero, 
       COUNT(r.id) as total_respostas, 
       SUM(r.correta) as acertos,
       (SUM(r.correta) / COUNT(r.id)) * 100 as porcentagem
       FROM alunos a
       JOIN respostas r ON a.id = r.aluno_id
       WHERE r.testee_id = ?
       GROUP BY a.id, a.nome, a.numero`,
            [id]
        );

        // Obter estatísticas por questão
        const [questoes] = await pool.query(
            `SELECT q.id, q.enunciado,
       COUNT(r.id) as total_respostas,
       SUM(r.correta) as acertos,
       (SUM(r.correta) / COUNT(r.id)) * 100 as porcentagem
       FROM teste_questoes tq
       JOIN questoes q ON tq.questao_id = q.id
       LEFT JOIN respostas r ON tq.questao_id = r.questao_id AND r.testee_id = tq.testee_id
       WHERE tq.testee_id = ?
       GROUP BY q.id, q.enunciado`,
            [id]
        );

        // Criar planilha Excel
        const wb = xlsx.utils.book_new();

        // Planilha de resultados dos alunos
        const alunosData = alunos.map(aluno => ({
            'Nome': aluno.nome,
            'Número': aluno.numero,
            'Respostas': aluno.total_respostas,
            'Acertos': aluno.acertos,
            'Porcentagem': aluno.porcentagem
        }));

        const alunosWS = xlsx.utils.json_to_sheet(alunosData);
        xlsx.utils.book_append_sheet(wb, alunosWS, 'Resultados Alunos');

        // Planilha de estatísticas por questão
        const questoesData = questoes.map(questao => ({
            'ID Questão': questao.id,
            'Enunciado': questao.enunciado,
            'Total Respostas': questao.total_respostas,
            'Acertos': questao.acertos,
            'Porcentagem Acertos': questao.porcentagem
        }));

        const questoesWS = xlsx.utils.json_to_sheet(questoesData);
        xlsx.utils.book_append_sheet(wb, questoesWS, 'Estatísticas Questões');

        // Gerar arquivo Excel
        const excelBuffer = xlsx.write(wb, { bookType: 'xlsx', type: 'buffer' });

        // Configurar resposta
        res.setHeader('Content-Disposition', `attachment; filename=resultados-teste-${id}.xlsx`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(excelBuffer);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao gerar relatório Excel' });
    }
    // Rotas para temas (junto com as outras rotas do professor)
    app.get('/api/professor/temas', authenticateToken, async (req, res) => {
        try {
            const [temas] = await pool.query('SELECT * FROM temas ORDER BY nome');
            res.json(temas);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao buscar temas' });
        }
    });

    app.post('/api/professor/temas', authenticateToken, async (req, res) => {
        const { nome, descricao } = req.body;

        try {
            const [result] = await pool.query(
                'INSERT INTO temas (nome, descricao) VALUES (?, ?)',
                [nome, descricao]
            );
            res.status(201).json({ id: result.insertId, nome, descricao });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao criar tema' });
        }
    });

    app.put('/api/professor/temas/:id', authenticateToken, async (req, res) => {
        const { id } = req.params;
        const { nome, descricao } = req.body;

        try {
            await pool.query(
                'UPDATE temas SET nome = ?, descricao = ? WHERE id = ?',
                [nome, descricao, id]
            );
            res.json({ id, nome, descricao });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao atualizar tema' });
        }
    });

    app.delete('/api/professor/temas/:id', authenticateToken, async (req, res) => {
        const { id } = req.params;

        try {
            await pool.query('DELETE FROM temas WHERE id = ?', [id]);
            res.status(204).send();
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Erro ao excluir tema' });
        }
    });

});

// Rotas para estudantes
app.post('/api/estudante/identificar', async (req, res) => {
    const { nome, numero } = req.body;

    try {
        // Verificar se aluno já existe
        const [existing] = await pool.query('SELECT * FROM alunos WHERE nome = ? AND numero = ?', [nome, numero]);

        let alunoId;
        if (existing.length > 0) {
            alunoId = existing[0].id;
        } else {
            const [result] = await pool.query('INSERT INTO alunos (nome, numero) VALUES (?, ?)', [nome, numero]);
            alunoId = result.insertId;
        }

        res.json({ id: alunoId, nome, numero });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao identificar aluno' });
    }
});

app.get('/api/estudante/testes', async (req, res) => {
    try {
        const [testes] = await pool.query(
            'SELECT t.*, tm.nome as tema_nome FROM testes t LEFT JOIN temas tm ON t.tema_id = tm.id'
        );
        res.json(testes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar testes disponíveis' });
    }
});

app.get('/api/estudante/testes/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Obter informações do teste
        const [teste] = await pool.query('SELECT * FROM testes WHERE id = ?', [id]);
        if (teste.length === 0) return res.status(404).json({ error: 'Teste não encontrado' });

        // Obter questões do teste (se especificadas) ou aleatórias
        let questoes;
        if (teste[0].tema_id || teste[0].dificuldade) {
            // Teste com filtros - buscar questões aleatórias com os filtros
            let query = 'SELECT q.* FROM questoes q WHERE 1=1';
            const params = [];

            if (teste[0].tema_id) {
                query += ' AND q.tema_id = ?';
                params.push(teste[0].tema_id);
            }

            if (teste[0].dificuldade) {
                query += ' AND q.dificuldade = ?';
                params.push(teste[0].dificuldade);
            }

            query += ' ORDER BY RAND() LIMIT ?';
            params.push(teste[0].quantidade_questoes || 10);

            [questoes] = await pool.query(query, params);
        } else {
            // Teste com questões específicas
            [questoes] = await pool.query(
                'SELECT q.* FROM teste_questoes tq JOIN questoes q ON tq.questao_id = q.id WHERE tq.testee_id = ?',
                [id]
            );
        }

        // Buscar alternativas para cada questão (embaralhadas)
        for (const questao of questoes) {
            const [alternativas] = await pool.query(
                'SELECT * FROM alternativas WHERE questao_id = ? ORDER BY RAND()',
                [questao.id]
            );
            questao.alternativas = alternativas;
        }

        res.json({
            teste: teste[0],
            questoes
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar teste' });
    }
});

app.post('/api/estudante/testes/:id/respostas', async (req, res) => {
    const { id } = req.params;
    const { aluno_id, respostas } = req.body;

    try {
        // Verificar se o aluno já respondeu este teste
        const [existing] = await pool.query(
            'SELECT * FROM respostas WHERE testee_id = ? AND aluno_id = ? LIMIT 1',
            [id, aluno_id]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Aluno já respondeu este teste' });
        }

        // Registrar respostas
        for (const resposta of respostas) {
            await pool.query(
                'INSERT INTO respostas (testee_id, aluno_id, questao_id, alternativa_id, correta) VALUES (?, ?, ?, ?, ?)',
                [id, aluno_id, resposta.questao_id, resposta.alternativa_id, resposta.correta]
            );
        }

        // Calcular resultado
        const [result] = await pool.query(
            'SELECT COUNT(*) as total, SUM(correta) as acertos FROM respostas WHERE testee_id = ? AND aluno_id = ?',
            [id, aluno_id]
        );

        const total = result[0].total;
        const acertos = result[0].acertos;
        const porcentagem = (acertos / total) * 100;

        res.json({
            total,
            acertos,
            porcentagem: porcentagem.toFixed(2)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao registrar respostas' });
    }
});

// Iniciar servidor
app.listen(port, () => {
    console.log(`Servidor backend rodando na porta ${port}`);
});