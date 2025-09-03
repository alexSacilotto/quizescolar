const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const xlsx = require('xlsx');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const app = express();
const port = 3001;
const os = require('os');

// Configurações Gerais

// Pasta de Uploads de imagens
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Banco de Dados
const dbConfig = {
    host: 'localhost',
    user: 'quiz_app',
    password: 'ShowCiencia123',
    database: 'quiz_escolar'
};

// Identificação da rede
function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const localIp = getLocalIp();

// Middleware
app.use(cors());
// Configuração do middleware para parsear JSON
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); // Para parsear formulários URL-encoded
app.use('/uploads', express.static(uploadDir, {
    setHeaders: (res, path) => {
        if (path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.png')) {
            res.setHeader('Content-Type', 'image/jpeg');
        }
    }
}));

// Autenticação
const secretKey = '1789e3eb833e28a866ad8c593dc72e69eb5610cd857dbad012bbb5dbf3a5e578';

// Configuração do Multer para upload de imagens
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Apenas imagens são permitidas!'), false);
        }
    }
});

// Conexão com o banco de dados
let pool;
async function initDb() {
    pool = await mysql.createPool(dbConfig);
}
initDb();

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
// Middleware de autenticação JWT
function authenticate(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Token de acesso não fornecido' });
    }

    jwt.verify(token, 'seu_segredo_jwt', (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token inválido ou expirado' });
        }

        req.user = user;
        next();
    });
}
// Rotas protegidas

// Rota para criar novo usuário (requer autenticação de admin)
app.post('/api/users', authenticate, async (req, res) => {
    if (req.user.username !== 'admin') {
        return res.status(403).json({ message: 'Apenas o admin pode criar novos usuários' });
    }

    const { username, password } = req.body;
    const conn = await mysql.createConnection(dbConfig);

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await conn.execute(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            [username, hashedPassword]
        );
        res.status(201).json({ message: 'Usuário criado com sucesso' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ message: 'Nome de usuário já existe' });
        } else {
            res.status(500).json({ message: err.message });
        }
    } finally {
        conn.end();
    }
});

// Rota para trocar senha
app.put('/api/users/change-password', authenticate, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const conn = await mysql.createConnection(dbConfig);

    try {
        // Verificar senha atual
        const [rows] = await conn.execute('SELECT * FROM users WHERE id = ?', [req.user.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Usuário não encontrado' });

        const user = rows[0];
        const validPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validPassword) return res.status(401).json({ message: 'Senha atual incorreta' });

        // Atualizar senha
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await conn.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, req.user.id]);

        res.json({ message: 'Senha alterada com sucesso' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    } finally {
        conn.end();
    }
});

//Rotas para professores

app.get('/api/professor/temas', authenticateToken, async (req, res) => {
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
    try {
        const { tema_id, enunciado, dificuldade, alternativas } = req.body;
        const imagem = req.file ? req.file.filename : null;

        if (!imagem && req.file === undefined) {
            return res.status(400).json({ error: 'Nenhuma imagem foi enviada' });
        }

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

// Rota para criar testes
app.post('/api/professor/testes', authenticateToken, async (req, res) => {
    const { titulo, tema_id, dificuldade, quantidade_questoes, questoes } = req.body;
    const usuario_id = req.user.id;

    try {
        // Validação básica
        if (!titulo) {
            return res.status(400).json({ error: 'O título do teste é obrigatório' });
        }

        const [testeResult] = await pool.query(
            'INSERT INTO testes (usuario_id, titulo, tema_id, dificuldade, quantidade_questoes) VALUES (?, ?, ?, ?, ?)',
            [
                usuario_id,
                titulo,
                tema_id || null, // Permite NULL para testes sem tema
                dificuldade || null,
                quantidade_questoes || 10
            ]
        );

        const testeId = testeResult.insertId;

        // Se questões específicas foram fornecidas, vinculá-las ao teste
        if (questoes && Array.isArray(questoes) && questoes.length > 0) {
            for (const questaoId of questoes) {
                await pool.query(
                    'INSERT INTO teste_questoes (teste_id, questao_id) VALUES (?, ?)',
                    [testeId, questaoId]
                );
            }
        }

        res.status(201).json({
            id: testeId,
            mensagem: 'Teste criado com sucesso',
            sem_tema: !tema_id ? 'Este teste foi criado sem tema específico' : undefined
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Erro ao criar teste',
            detalhes: error.message
        });
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

app.get('/api/professor/testes', authenticateToken, async (req, res) => {
    const usuario_id = req.user.id; // Obtém o ID do professor autenticado

    try {
        // Consulta para obter todos os testes do professor com informações de tema
        const [testes] = await pool.query(`
            SELECT 
                t.id,
                t.titulo,
                t.dificuldade,
                t.quantidade_questoes,
                t.created_at,
                IFNULL(tm.nome, 'Sem tema definido') as tema_nome,
                COUNT(DISTINCT r.aluno_id) as total_alunos,
                COUNT(DISTINCT tq.questao_id) as total_questoes
            FROM 
                testes t
            LEFT JOIN 
                temas tm ON t.tema_id = tm.id
            LEFT JOIN 
                teste_questoes tq ON t.id = tq.teste_id
            LEFT JOIN 
                respostas r ON t.id = r.teste_id
            WHERE 
                t.usuario_id = ?
            GROUP BY 
                t.id, t.titulo, t.dificuldade, t.quantidade_questoes, t.created_at, tm.nome
            ORDER BY 
                t.created_at DESC
        `, [usuario_id]);

        // Formata os dados de resposta
        const testesFormatados = testes.map(teste => ({
            id: teste.id,
            titulo: teste.titulo,
            tema: teste.tema_nome,
            dificuldade: teste.dificuldade || 'Não especificada',
            quantidade_questoes: teste.total_questoes > 0 ? teste.total_questoes : teste.quantidade_questoes,
            total_alunos: teste.total_alunos,
            criado_em: teste.created_at,

            // Adiciona uma flag para testes sem questões vinculadas
            configurado: teste.total_questoes > 0
        }));

        res.json(testesFormatados);
    } catch (error) {
        console.error('Erro ao buscar testes:', error);
        res.status(500).json({
            error: 'Erro ao listar testes',
            detalhes: error.message
        });
    }
});

app.get('/api/professor/testes/:id/resultados', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        // Coleta de informações do teste
        const [teste] = await pool.query(
            'SELECT t.*, IFNULL(tm.nome, "Múltiplos temas") as tema_nome FROM testes t LEFT JOIN temas tm ON t.tema_id = tm.id WHERE t.id = ?',
            [id]
        );

        if (teste.length === 0) {
            return res.status(404).json({ error: 'Teste não encontrado' });
        }

        // Lista total de alunos que responderam o teste
        const [alunos] = await pool.query(
            `SELECT DISTINCT a.id, a.nome, a.numero 
             FROM respostas r 
             JOIN alunos a ON r.aluno_id = a.id 
             WHERE r.teste_id = ?`,
            [id]
        );

        // Questões do teste
        const [questoes] = await pool.query(
            `SELECT q.id, q.enunciado 
             FROM teste_questoes tq 
             JOIN questoes q ON tq.questao_id = q.id 
             WHERE tq.teste_id = ?`,
            [id]
        );

        // Se não tiver questões vinculadas, busca as questões que foram respondidas
        if (questoes.length === 0) {
            [questoes] = await pool.query(
                `SELECT DISTINCT q.id, q.enunciado 
                 FROM respostas r 
                 JOIN questoes q ON r.questao_id = q.id 
                 WHERE r.teste_id = ?`,
                [id]
            );
        }

        // Resultados por aluno
        const resultadosAlunos = await Promise.all(alunos.map(async aluno => {
            const [respostas] = await pool.query(
                `SELECT 
                    COUNT(*) as total_questoes,
                    SUM(correta) as acertos,
                    (SUM(correta) / COUNT(*)) * 100 as porcentagem,
                    MAX(data_resposta) as data_ultima_resposta
                 FROM respostas 
                 WHERE teste_id = ? AND aluno_id = ?`,
                [id, aluno.id]
            );

            return {
                aluno: {
                    id: aluno.id,
                    nome: aluno.nome,
                    numero: aluno.numero
                },
                total_questoes: respostas[0].total_questoes,
                acertos: respostas[0].acertos,
                porcentagem: Number(respostas[0].porcentagem).toFixed(2),
                data_ultima_resposta: respostas[0].data_ultima_resposta
            };
        }));

        // Estatísticas por questão
        const estatisticasQuestoes = await Promise.all(questoes.map(async questao => {
            const [respostas] = await pool.query(
                `SELECT 
                    COUNT(*) as total_respostas,
                    SUM(correta) as acertos,
                    (SUM(correta) / COUNT(*)) * 100 as porcentagem
                 FROM respostas 
                 WHERE teste_id = ? AND questao_id = ?`,
                [id, questao.id]
            );

            return {
                questao: {
                    id: questao.id,
                    enunciado: questao.enunciado
                },
                total_respostas: respostas[0].total_respostas,
                acertos: respostas[0].acertos,
                porcentagem: Number(respostas[0].porcentagem).toFixed(2)
            };
        }));

        res.json({
            teste: {
                id: teste[0].id,
                titulo: teste[0].titulo,
                tema: teste[0].tema_nome,
                dificuldade: teste[0].dificuldade || 'Não especificada',
                quantidade_alunos: alunos.length
            },
            alunos: resultadosAlunos,
            questoes: estatisticasQuestoes
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Erro ao buscar resultados',
            detalhes: error.message
        });
    }
});

// Rota para excluir questão
app.delete('/api/professor/questoes/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        // Verifica se a questão existe
        const [questao] = await pool.query('SELECT * FROM questoes WHERE id = ?', [id]);
        if (questao.length === 0) {
            return res.status(404).json({ error: 'Questão não encontrada' });
        }

        // Exclui as alternativas primeiro (devido à chave estrangeira)
        await pool.query('DELETE FROM alternativas WHERE questao_id = ?', [id]);

        // Exclui a questão
        await pool.query('DELETE FROM questoes WHERE id = ?', [id]);

        res.json({ message: 'Questão excluída com sucesso' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao excluir questão' });
    }
});

// Rota para excluir tema
app.delete('/api/professor/temas/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        // Verifica se o tema existe
        const [tema] = await pool.query('SELECT * FROM temas WHERE id = ?', [id]);
        if (tema.length === 0) {
            return res.status(404).json({ error: 'Tema não encontrado' });
        }

        // Verifica se há questões associadas ao tema
        const [questoes] = await pool.query('SELECT id FROM questoes WHERE tema_id = ?', [id]);

        if (questoes.length > 0) {
            return res.status(400).json({
                error: 'Não é possível excluir tema com questões associadas',
                questoesAssociadas: questoes.map(q => q.id)
            });
        }

        // Exclui o tema
        await pool.query('DELETE FROM temas WHERE id = ?', [id]);

        res.json({ message: 'Tema excluído com sucesso' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao excluir tema' });
    }
});

app.get('/api/professor/testes/:id/resultados/excel', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        // Informações do teste
        const [teste] = await pool.query(
            'SELECT t.*, IFNULL(tm.nome, "Múltiplos temas") as tema_nome FROM testes t LEFT JOIN temas tm ON t.tema_id = tm.id WHERE t.id = ?',
            [id]
        );

        if (teste.length === 0) {
            return res.status(404).json({ error: 'Teste não encontrado' });
        }

        // Alunos e seus resultados
        const [alunos] = await pool.query(
            `SELECT 
                a.id, a.nome, a.numero,
                COUNT(r.id) as total_respostas,
                SUM(r.correta) as acertos,
                (SUM(r.correta) / COUNT(r.id)) * 100 as porcentagem,
                MAX(r.data_resposta) as data_ultima_resposta
             FROM respostas r
             JOIN alunos a ON r.aluno_id = a.id
             WHERE r.teste_id = ?
             GROUP BY a.id, a.nome, a.numero`,
            [id]
        );

        // Estatísticas por questão
        const [questoes] = await pool.query(
            `SELECT 
                q.id, q.enunciado,
                COUNT(r.id) as total_respostas,
                SUM(r.correta) as acertos,
                SUM(r.correta) / COUNT(r.id) * 100 as porcentagem
             FROM respostas r
             JOIN questoes q ON r.questao_id = q.id
             WHERE r.teste_id = ?
             GROUP BY q.id, q.enunciado`,
            [id]
        );

        // Criar planilha Excel
        const wb = xlsx.utils.book_new();

        // Planilha 1: Informações do Teste
        const infoTeste = [{
            'ID': teste[0].id,
            'Título': teste[0].titulo,
            'Tema': teste[0].tema_nome,
            'Dificuldade': teste[0].dificuldade || 'Não especificada',
            'Total de Alunos': alunos.length,
            'Total de Questões': questoes.length,
            'Data de Criação': teste[0].created_at ? new Date(teste[0].created_at).toLocaleDateString() : 'Não disponível'
        }];
        xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(infoTeste), 'Informações');

        // Planilha 2: Resultados dos Alunos
        const dadosAlunos = alunos.map(aluno => ({
            'ID': aluno.id,
            'Nome': aluno.nome,
            'Número': aluno.numero,
            'Questões Respondidas': aluno.total_respostas,
            'Acertos': aluno.acertos,
            'Porcentagem': Number(aluno.porcentagem).toFixed(2) + '%',
            'Data Última Resposta': aluno.data_ultima_resposta
        }));
        xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(dadosAlunos), 'Alunos');

        // Planilha 3: Desempenho por Questão
        const dadosQuestoes = questoes.map(questao => ({
            'ID': questao.id,
            'Enunciado': questao.enunciado,
            'Total Respostas': questao.total_respostas,
            'Acertos': questao.acertos,
            'Porcentagem Acerto': Number(questao.porcentagem).toFixed(2) + '%'
        }));
        xlsx.utils.book_append_sheet(wb, xlsx.utils.json_to_sheet(dadosQuestoes), 'Questões');

        // Gerar arquivo
        const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', `attachment; filename=resultados-teste-${id}.xlsx`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Erro ao gerar relatório Excel',
            detalhes: error.message
        });
    }
});

// Rotas de estudantes (alunos)
app.post('/api/estudante/identificar', async (req, res) => {
    const { nome, numero } = req.body;

    try {
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
        // Busca informações básicas do teste
        const [teste] = await pool.query(
            'SELECT t.*, IFNULL(tm.nome, "Múltiplos temas") as tema_nome FROM testes t LEFT JOIN temas tm ON t.tema_id = tm.id WHERE t.id = ?',
            [id]
        );

        if (teste.length === 0) {
            return res.status(404).json({ error: 'Teste não encontrado' });
        }

        let questoes;

        // Verifica se o teste tem questões vinculadas
        const [vinculadas] = await pool.query(
            'SELECT COUNT(*) as total FROM teste_questoes WHERE teste_id = ?',
            [id]
        );

        if (vinculadas[0].total > 0) {
            // Busca questões vinculadas
            [questoes] = await pool.query(
                `SELECT q.*, IFNULL(t.nome, 'Sem tema') as tema_nome 
                 FROM teste_questoes tq 
                 JOIN questoes q ON tq.questao_id = q.id 
                 LEFT JOIN temas t ON q.tema_id = t.id 
                 WHERE tq.teste_id = ?`,
                [id]
            );
        } else {
            // Busca questões aleatórias baseadas nos critérios
            let query = `
                SELECT q.*, IFNULL(t.nome, 'Sem tema') as tema_nome 
                FROM questoes q 
                LEFT JOIN temas t ON q.tema_id = t.id
                WHERE 1=1
            `;
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
        }

        // Busca alternativas para cada questão
        for (const questao of questoes) {
            const [alternativas] = await pool.query(
                'SELECT * FROM alternativas WHERE questao_id = ? ORDER BY RAND()',
                [questao.id]
            );
            questao.alternativas = alternativas;
        }

        res.json({
            teste: {
                id: teste[0].id,
                titulo: teste[0].titulo,
                tema: teste[0].tema_nome,
                dificuldade: teste[0].dificuldade || 'Não especificada',
                quantidade_questoes: questoes.length,
                tempo_limite: teste[0].tempo_limite
            },
            questoes
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Erro ao buscar teste',
            detalhes: error.message
        });
    }
});

app.get('/api/estudante/testes-realizados', async (req, res) => {
    const { aluno_id } = req.query;

    if (!aluno_id) {
        return res.status(400).json({
            error: 'Parâmetro aluno_id é obrigatório',
            exemplo: '/api/estudante/testes-realizados?aluno_id=123'
        });
    }

    try {
        // Verifica se o aluno existe
        const [aluno] = await pool.query('SELECT id FROM alunos WHERE id = ?', [aluno_id]);
        if (aluno.length === 0) {
            return res.status(404).json({ error: 'Aluno não encontrado' });
        }

        const [testes] = await pool.query(`
            SELECT 
                t.id, 
                t.titulo,
                IFNULL(tm.nome, 'Múltiplos temas') as tema_nome,
                COUNT(r.id) as total_questoes,
                SUM(r.correta) as acertos,
                MAX(r.data_resposta) as data_ultima_resposta,
                CASE 
                    WHEN COUNT(r.id) > 0 THEN (SUM(r.correta) / COUNT(r.id)) * 100
                    ELSE 0
                END as porcentagem
            FROM respostas r
            JOIN testes t ON r.teste_id = t.id
            LEFT JOIN temas tm ON t.tema_id = tm.id
            WHERE r.aluno_id = ?
            GROUP BY t.id, t.titulo, tm.nome
            ORDER BY MAX(r.data_resposta) DESC
        `, [aluno_id]);

        const testesFormatados = testes.map(teste => ({
            id: teste.id,
            titulo: teste.titulo,
            tema: teste.tema_nome,
            total_questoes: teste.total_questoes,
            acertos: teste.acertos,
            porcentagem: Number(teste.porcentagem).toFixed(2),
            data_ultima_resposta: teste.data_ultima_resposta
        }));

        res.json(testesFormatados);
    } catch (error) {
        console.error('Erro detalhado:', error);
        res.status(500).json({
            error: 'Erro interno ao processar a requisição',
            detalhes: error.message
        });
    }
});

app.post('/api/estudante/testes/:id/respostas', async (req, res) => {
    const { id: teste_id } = req.params;
    const { aluno_id, respostas } = req.body;

    // Validações básicas
    if (!aluno_id || !respostas || !Array.isArray(respostas)) {
        return res.status(400).json({
            error: 'Parâmetros inválidos',
            detalhes: 'aluno_id e respostas (array) são obrigatórios'
        });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Verifica se o aluno existe
        const [aluno] = await connection.query('SELECT id FROM alunos WHERE id = ?', [aluno_id]);
        if (aluno.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Aluno não encontrado' });
        }

        // 2. Verifica se o teste existe
        const [teste] = await connection.query('SELECT id FROM testes WHERE id = ?', [teste_id]);
        if (teste.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Teste não encontrado' });
        }

        // 3. Verifica se as questões existem e pertencem ao teste
        const questaoIds = respostas.map(r => r.questao_id);
        const [questoesExistentes] = await connection.query(
            `SELECT q.id 
             FROM questoes q
             LEFT JOIN teste_questoes tq ON q.id = tq.questao_id AND tq.teste_id = ?
             WHERE q.id IN (?) AND (tq.teste_id IS NOT NULL OR EXISTS (
                 SELECT 1 FROM testes t 
                 WHERE t.id = ? AND (t.tema_id IS NULL OR q.tema_id = t.tema_id)
             ))`,
            [teste_id, questaoIds, teste_id]
        );

        const idsExistentes = new Set(questoesExistentes.map(q => q.id));
        const respostasValidas = respostas.filter(r => idsExistentes.has(r.questao_id));

        if (respostasValidas.length !== respostas.length) {
            await connection.rollback();
            return res.status(400).json({
                error: 'Algumas questões não existem ou não pertencem ao teste',
                questoes_invalidas: respostas
                    .filter(r => !idsExistentes.has(r.questao_id))
                    .map(r => r.questao_id)
            });
        }

        // 4. Verifica alternativas para cada questão
        const alternativasIds = respostas.map(r => r.alternativa_id);
        const [alternativasExistentes] = await connection.query(
            `SELECT a.id, a.questao_id 
             FROM alternativas a
             WHERE a.id IN (?) AND a.questao_id IN (?)`,
            [alternativasIds, questaoIds]
        );

        const alternativasValidas = new Set(
            alternativasExistentes.map(a => `${a.questao_id}-${a.id}`)
        );

        const respostasCompletamenteValidas = respostasValidas.filter(r =>
            alternativasValidas.has(`${r.questao_id}-${r.alternativa_id}`)
        );

        if (respostasCompletamenteValidas.length !== respostas.length) {
            await connection.rollback();
            return res.status(400).json({
                error: 'Algumas alternativas não existem ou não pertencem às questões',
                alternativas_invalidas: respostasValidas
                    .filter(r => !alternativasValidas.has(`${r.questao_id}-${r.alternativa_id}`))
                    .map(r => ({ questao_id: r.questao_id, alternativa_id: r.alternativa_id }))
            });
        }

        // 5. Insere as respostas válidas
        const dataResposta = new Date().toISOString().slice(0, 19).replace('T', ' ');
        for (const resposta of respostasCompletamenteValidas) {
            await connection.query(
                `INSERT INTO respostas 
                 (teste_id, aluno_id, questao_id, alternativa_id, correta, data_resposta)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [teste_id, aluno_id, resposta.questao_id, resposta.alternativa_id, resposta.correta, dataResposta]
            );
        }

        await connection.commit();

        // 6. Calcula estatísticas
        const [resultado] = await connection.query(
            `SELECT 
                COUNT(*) as total,
                SUM(correta) as acertos,
                (SUM(correta) / COUNT(*)) * 100 as porcentagem
             FROM respostas 
             WHERE teste_id = ? AND aluno_id = ?`,
            [teste_id, aluno_id]
        );

        connection.release();

        res.status(201).json({
            teste_id,
            aluno_id,
            total_questoes: resultado[0].total,
            acertos: resultado[0].acertos,
            porcentagem: Number(resultado[0].porcentagem).toFixed(2),
            data_resposta: dataResposta
        });

    } catch (error) {
        if (connection) await connection.rollback();
        if (connection) connection.release();

        console.error('Erro detalhado:', error);

        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            res.status(400).json({
                error: 'Dados inconsistentes',
                detalhes: 'Verifique se todas questões e alternativas existem'
            });
        } else {
            res.status(500).json({
                error: 'Erro ao processar respostas',
                detalhes: error.message
            });
        }
    }
});

//API SERVER

// Iniciar servidor -> Rodando na porta 3001 atualmente
app.listen(port, localIp, () => {
    console.log(`Servidor rodando em http://${localIp}:${port}`);
    console.log(`Disponível para toda a rede local`);
});