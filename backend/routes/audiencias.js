const express = require('express');
const router = express.Router();
const { supabasePublic } = require('../supabase');

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabasePublic
      .from('audiencias')
      .select('*, processos(numero_cnj), clientes(nome)');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { data, error } = await supabasePublic
      .from('audiencias')
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
