const bcrypt = require('bcrypt');

// N�mero de rounds para o salt (mesmo que n�o forne�amos o salt manualmente)
const saltRounds = 10;

// Senha que voc� quer hashear
const plainPassword = 'Admin123';

// Criando o hash (o bcrypt vai gerar e incluir o salt automaticamente)
bcrypt.hash(plainPassword, saltRounds)
    .then(hash => {
        console.log('Hash para inserir no banco de dados:', hash);

        // O hash inclui o salt automaticamente no formato:
        // $2a$10$N9qo8uLOickgx2ZMRZoMy... (exemplo)
        // Onde:
        // $2a$ - identificador do algoritmo
        // 10$ - custo (saltRounds)
        // N9qo8uLOickgx2ZMRZoMy... - salt (22 chars) + hash (31 chars)
    })
    .catch(err => {
        console.error('Erro ao gerar hash:', err);
    });