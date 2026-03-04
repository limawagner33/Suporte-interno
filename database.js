const sqlite3 = require('sqlite3').verbose();

// Criando a V3 do banco pra limpar os erros de Foreign Key
const db = new sqlite3.Database('./ativos_v3.db', (err) => {
    if (err) console.error('[ERRO FATAL] Falha no DB:', err.message);
    else console.log('[OK] Banco de Dados V3 atualizado.');
});

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT NOT NULL, setor TEXT NOT NULL, login TEXT UNIQUE NOT NULL, senha TEXT NOT NULL, perfil TEXT NOT NULL)`);
    db.run(`CREATE TABLE IF NOT EXISTS tecnicos (id INTEGER PRIMARY KEY AUTOINCREMENT, nome TEXT UNIQUE NOT NULL)`);
    db.run(`CREATE TABLE IF NOT EXISTS equipamentos (patrimonio TEXT PRIMARY KEY, modelo TEXT, tipo TEXT)`);
    
    // A grande correção aq: tirei a FK de patrimonio pq o usuario pode digitar uma tag nova q nao ta no sistema ainda
    db.run(`
        CREATE TABLE IF NOT EXISTS chamados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_usuario INTEGER,
            patrimonio TEXT,
            setor TEXT,
            componente TEXT,
            descricao TEXT,
            status TEXT DEFAULT 'Aberto',
            tecnico_atribuido TEXT,
            notificado INTEGER DEFAULT 1,
            data_abertura DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(id_usuario) REFERENCES usuarios(id)
        )
    `);

    // Semeando os dados iniciais pra logar
    const insertUsers = db.prepare(`INSERT OR IGNORE INTO usuarios (nome, setor, login, senha, perfil) VALUES (?, ?, ?, ?, ?)`);
    insertUsers.run('Admin Master', 'Suporte TI', 'admin', '123', 'admin');
    insertUsers.run('Colaborador Teste', 'Geral', 'joao', '123', 'comum');
    insertUsers.finalize();

    db.run(`INSERT OR IGNORE INTO tecnicos (nome) VALUES ('Tecnico Padrao')`);
});

module.exports = db;