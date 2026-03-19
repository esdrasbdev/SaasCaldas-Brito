/*
 * API Processos - protegida auth
 * CRUD + joins cliente/advogado
 */

const express = require('express');
const authMiddleware = require('../middleware/auth.js');
const supabase = require('../supabase.js');

const router = express.Router();

// GET /api/processos - lista com filtros
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, cliente_id, advogado_id, busca } = req.query;
    
    let query = supabase.from('processos').select(`
      *,
      clientes (nome),
      usuarios!advogado_id (nome)
    `).order('criado_em', { ascending: false });

    if (status) query.eq('status', status);
    if (cliente_id) query.eq('cliente_id', cliente_id);
    if (advogado_id) query.eq('advogado_id', advogado_id);
    if (busca) query.or(`numero_cnj.ilike.%${busca}%,clientes.nome.ilike.%${busca}%`);

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({ processos: data, total: count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/processos
router.post('/', authMiddleware, async (req, res) => {
  try {
    const processo = { ...req.body, criado_por: req.user.id };
    const { data, error } = await supabase.from('processos').insert([processo]).select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET/PUT/DELETE /api/processos/:id
router.route('/:id')
  .get(authMiddleware, async (req, res) => {
    const { data, error } = await supabase.from('processos').select(`
      *,
      clientes(nome),
      usuarios!advogado_id(nome)
    `).eq('id', req.params.id).single();
    if (error || !data) return res.status(404).json({ error: 'Não encontrado' });
    res.json(data);
  })
  .put(authMiddleware, async (req, res) => {
    const { data, error } = await supabase.from('processos').update(req.body).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json(data);
  })
  .delete(authMiddleware, async (req, res) => {
    const { error } = await supabase.from('processos').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Processo excluído' });
  });

module.exports = router;
