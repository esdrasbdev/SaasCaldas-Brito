
require('dotenv').config();

// Importações necessárias
const express = require('express');
const cors = require('cors');
const path = require('path');

// Inicializa Express
const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares essenciais
// CORS necessário para frontend local (http://localhost:8080)
app.use(cors({
  origin: [
    'http://localhost:8080', 
    'http://127.0.0.1:8080',
    'http://localhost:3000', // Padrão npx serve
    'http://localhost:5000'  // Alternativa npx serve
  ],
  credentials: true
}));

// Parser JSON para bodies das requisições
app.use(express.json({ limit: '10mb' })); // 10mb para documentos
app.use(express.urlencoded({ extended: true }));

// Rotas principais
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Rota raiz para confirmação visual (evita o erro 404 ao abrir no navegador)
app.get('/', (req, res) => {
  res.json({ message: 'Backend Jurídico rodando com sucesso! 🚀', status: 'ONLINE' });
});

// Seed: Garante usuários padrão ao iniciar
require('./seed.js')();

// Importa middleware
const authMiddleware = require('./middleware/auth.js');

// Importa rotas
const clientesRouter = require('./routes/clientes.js');
app.use('/api/clientes', clientesRouter);

const processosRouter = require('./routes/processos.js');
app.use('/api/processos', processosRouter);

// 404 para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada' });
});

// Inicialização do servidor com log claro
app.listen(PORT, () => {
  console.log(`🚀 Backend Jurídico rodando em http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log('💡 Próximo passo: npm install && npm run dev');
});

module.exports = app;
