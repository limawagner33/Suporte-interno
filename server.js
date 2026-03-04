const express = require('express');
const cors = require('cors');
const db = require('./database');

const app = express();
app.use(cors());
app.use(express.json());

// --- AUTENTICACAO ---
app.post('/api/login', (req, res) => {
    const { login, senha } = req.body;
    db.get(`SELECT id, nome, setor, perfil FROM usuarios WHERE login = ? AND senha = ?`, [login, senha], (err, row) => {
        if (err) return res.status(500).json({ erro: 'Erro interno no banco.' });
        if (!row) return res.status(401).json({ erro: 'Credenciais inválidas. Tente novamente.' });
        res.json({ mensagem: 'Login aprovado.', usuario: row });
    });
});

// --- TECNICOS (CRUD Completo) ---
app.get('/api/tecnicos', (req, res) => {
    db.all(`SELECT * FROM tecnicos ORDER BY nome ASC`, [], (err, rows) => res.json(rows || []));
});

// Cadastro blindado contra duplicidade
app.post('/api/tecnicos', (req, res) => {
    const nome = req.body.nome.trim();

    // A logica do LOWER() garante que "Jonas" e "jonas" sejam a mesma coisa na busca
    db.get(`SELECT id FROM tecnicos WHERE LOWER(nome) = LOWER(?)`, [nome], (err, row) => {
        if (err) return res.status(500).json({ erro: 'Erro interno no banco de dados.' });
        
        // Se a variavel row existir, significa que o banco achou alguem com esse nome
        if (row) return res.status(400).json({ erro: 'Nao e possivel, ja tem um analista cadastrado com esse nome.' });

        // Se passou direto, a gente insere
        db.run(`INSERT INTO tecnicos (nome) VALUES (?)`, [nome], function(err) {
            if (err) return res.status(500).json({ erro: 'Falha ao salvar tecnico.' });
            res.status(201).json({ id: this.lastID, nome });
        });
    });
});

// Edicao blindada
app.put('/api/tecnicos/:id', (req, res) => {
    const novoNome = req.body.nome.trim();
    const id = req.params.id;

    // A mesma logica de busca, mas exclui o id do proprio cara que estamos editando 
    // (pra ele nao dar erro de duplicidade com o nome dele mesmo caso ele so mude o sobrenome)
    db.get(`SELECT id FROM tecnicos WHERE LOWER(nome) = LOWER(?) AND id != ?`, [novoNome, id], (err, row) => {
        if (err) return res.status(500).json({ erro: 'Erro interno.' });
        
        if (row) return res.status(400).json({ erro: 'Nao e possivel, ja tem um analista cadastrado com esse nome.' });

        db.run(`UPDATE tecnicos SET nome = ? WHERE id = ?`, [novoNome, id], err => {
            if (err) return res.status(500).json({ erro: err.message });
            res.json({ mensagem: 'Atualizado com sucesso.' });
        });
    });
});

// Excluir tecnico continua igual
app.delete('/api/tecnicos/:id', (req, res) => {
    db.run(`DELETE FROM tecnicos WHERE id = ?`, [req.params.id], err => {
        if (err) return res.status(500).json({ erro: err.message });
        res.json({ mensagem: 'Removido com sucesso.' });
    });
});

// --- CHAMADOS ---
app.post('/api/chamados', (req, res) => {
    const { id_usuario, patrimonio, setor, componente, descricao } = req.body;
    const sql = `INSERT INTO chamados (id_usuario, patrimonio, setor, componente, descricao) VALUES (?, ?, ?, ?, ?)`;
    
    // Agora o erro sobe pro front se der ruim, em vez de silenciar
    db.run(sql, [id_usuario, patrimonio, setor, componente, descricao], function(err) {
        if (err) {
            console.error('[ERRO CHAMADO]', err.message);
            return res.status(500).json({ erro: 'Falha ao gravar chamado no banco.' });
        }
        res.status(201).json({ mensagem: 'Chamado registrado com sucesso.', id: this.lastID });
    });
});

app.get('/api/chamados', (req, res) => {
    const id = req.query.id_usuario;
    const sql = id ? `SELECT * FROM chamados WHERE id_usuario = ? ORDER BY data_abertura DESC` : `SELECT * FROM chamados ORDER BY data_abertura DESC`;
    db.all(sql, id ? [id] : [], (err, rows) => res.json(rows || []));
});

app.patch('/api/chamados/:id', (req, res) => {
    const { tecnico_atribuido, status } = req.body;
    let notificado = status === 'Resolvido' ? 0 : 1; 
    db.run(`UPDATE chamados SET tecnico_atribuido = COALESCE(?, tecnico_atribuido), status = COALESCE(?, status), notificado = ? WHERE id = ?`, 
        [tecnico_atribuido, status, notificado, req.params.id], err => {
        if (err) return res.status(500).json({ erro: err.message });
        res.json({ mensagem: 'Status alterado.' });
    });
});

// --- POLLING NOTIFICACOES ---
app.get('/api/notificacoes/:idUsuario', (req, res) => {
    db.get(`SELECT id, patrimonio FROM chamados WHERE id_usuario = ? AND status = 'Resolvido' AND notificado = 0`, [req.params.idUsuario], (err, row) => {
        if (row) {
            db.run(`UPDATE chamados SET notificado = 1 WHERE id = ?`, [row.id]);
            return res.json({ tocarSom: true, chamado: row.patrimonio });
        }
        res.json({ tocarSom: false });
    });
});

const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => console.log(`Servidor rodando liso na porta ${PORTA}`));