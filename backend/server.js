const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken'); // Importa a biblioteca JWT

const app = express();
const server = http.createServer(app);

// Configuração do WebSocket com CORS para permitir conexões do frontend
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173", // URL do seu frontend
    methods: ["GET", "POST"]
  }
});

// Chave secreta para assinar e verificar os tokens JWT. Mantenha-a segura em produção!
const JWT_SECRET = 'sua_chave_secreta_muito_segura';

// Middleware para processar JSON e habilitar CORS
app.use(cors({
  origin: "http://localhost:5173"
}));
app.use(express.json());

// Estrutura de dados para a fila de senhas
let filaDeSenhas = [];
let senhasChamadas = []; // Histórico das senhas chamadas
let senhaAtual = null;
let proximoNumero = 1;

// Objeto de usuários para simular um banco de dados
const users = {
  atendente: '123' // username: password
};

// Middleware para autenticar o token JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) {
    return res.sendStatus(401); // Se não houver token, retorna erro de não autorizado
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.sendStatus(403); // Se o token não for válido, retorna erro de acesso proibido
    }
    req.user = user;
    next();
  });
}

// Endpoint para login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // Verifica se o usuário e a senha correspondem
  if (users[username] === password) {
    // Cria o token JWT com o nome de usuário
    const accessToken = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token: accessToken });
  } else {
    res.status(401).json({ message: 'Credenciais inválidas' });
  }
});

// Endpoint para gerar uma nova senha
app.post('/gerar-senha', (req, res) => {
  const { servico } = req.body;
  const novaSenha = {
    numero: `S-${String(proximoNumero).padStart(3, '0')}`,
    servico: servico,
    guiche: null,
    prioritaria: false, // Adicionado para futura funcionalidade
  };
  filaDeSenhas.push(novaSenha);
  proximoNumero++;

  io.emit('fila_atualizada', { fila: filaDeSenhas });
  console.log(`Nova senha gerada: ${novaSenha.numero} para ${servico}`);
  res.status(201).json(novaSenha);
});

// Endpoint para chamar a próxima senha (agora protegida)
app.post('/chamar-proxima', authenticateToken, (req, res) => {
  if (filaDeSenhas.length > 0) {
    const proximaSenha = filaDeSenhas.shift();
    proximaSenha.guiche = 1; // Atribuir um guichê para a demonstração
    senhaAtual = proximaSenha;
    senhasChamadas.unshift(senhaAtual); // Adiciona ao histórico

    io.emit('senha_chamada', { senha_atual: senhaAtual, senhas_chamadas: senhasChamadas });
    io.emit('fila_atualizada', { fila: filaDeSenhas });
    console.log(`Chamando senha: ${proximaSenha.numero} para o guichê ${proximaSenha.guiche}`);
    res.status(200).json(proximaSenha);
  } else {
    res.status(404).send('Nenhuma senha na fila');
  }
});

// Endpoint para finalizar o atendimento (agora protegida)
app.post('/finalizar-atendimento', authenticateToken, (req, res) => {
  if (senhaAtual) {
    console.log(`Atendimento finalizado para a senha: ${senhaAtual.numero}`);
    senhaAtual = null;

    io.emit('senha_chamada', { senha_atual: null, senhas_chamadas: senhasChamadas });
    res.status(200).send('Atendimento finalizado');
  } else {
    res.status(404).send('Nenhuma senha em atendimento');
  }
});

// Endpoint para reencaminhar a senha (agora protegida)
app.post('/reencaminhar-senha', authenticateToken, (req, res) => {
  if (senhaAtual) {
    console.log(`Reencaminhando senha: ${senhaAtual.numero}`);
    filaDeSenhas.unshift(senhaAtual);
    senhaAtual = null;

    io.emit('senha_chamada', { senha_atual: null, senhas_chamadas: senhasChamadas });
    io.emit('fila_atualizada', { fila: filaDeSenhas });
    res.status(200).send('Senha reencaminhada para o final da fila');
  } else {
    res.status(404).send('Nenhuma senha em atendimento para reencaminhar');
  }
});

// Endpoint para obter o estado atual do sistema
app.get('/estado', (req, res) => {
  res.json({
    fila: filaDeSenhas,
    senha_atual: senhaAtual,
    senhas_chamadas: senhasChamadas,
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
