/*
 * Rotas API Clientes - protegidas por auth middleware
 * GET/POST/PUT/DELETE com Supabase service_role
 */

const express = require('express');
const authMiddleware = require('../middleware/auth.js');
const requireRole = require('../middleware/requireRole.js');
const supabase = require('../supabase.js');

const router = express.Router();

// GET /api/clientes - lista todos (paginado)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filtro = req.query.filtro || '';

    let query = supabase
      .from('clientes')
      .select('*', { count: 'exact' })
      .range((page - 1) * limit, page * limit - 1)
      .order('nome');

    if (filtro) {
      query = query.or(`nome.ilike.%${filtro}%,documento.ilike.%${filtro}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      clientes: data,
      total: count,
      page,
      limit,
      pages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Erro GET clientes:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/clientes - criar novo
router.post('/', authMiddleware, async (req, res) => {
  try {
    const cliente = {
      ...req.body,
      criado_por: req.user.id
    };

    const { data, error } = await supabase.from('clientes').insert([cliente]).select();

    if (error) throw error;

    res.status(201).json(data[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/clientes/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/clientes/:id - atualizar
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE /api/clientes/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', req.params.id)
      .select();

    if (error) throw error;

    res.json({ message: 'Cliente excluído' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
