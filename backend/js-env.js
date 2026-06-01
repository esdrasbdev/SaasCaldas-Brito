// Serve variáveis públicas para o frontend (window._env)
// Mantém somente SUPABASE_URL e SUPABASE_ANON_KEY.
require('dotenv').config();

const express = require('express');

const router = express.Router();

router.get('/js/env.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=3600');

  const url = process.env.SUPABASE_URL || '';
  const anonKey = process.env.SUPABASE_ANON_KEY || '';

  res.send(`window._env = {
  SUPABASE_URL: ${JSON.stringify(url)},
  SUPABASE_ANON_KEY: ${JSON.stringify(anonKey)}
};`);
});

module.exports = router;

