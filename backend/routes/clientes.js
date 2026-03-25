/*
 * Rotas de Clientes (Backend)
 * Exemplo de estrutura de rota protegida
 */

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const supabase = require('../supabase');

// Middleware de proteção global para estas rotas
router.use(auth);

// GET /api/clientes - Lista todos (Exemplo de endpoint server-side)
router.get('/', async (req, res) => {
  try {
    // Exemplo: O backend pode fazer filtros adicionais ou logs de auditoria aqui
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nome', { ascending: true });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;