/*
 * Cliente Supabase singleton para o backend
 * Usa a SERVICE_ROLE_KEY para ter acesso administrativo
 * e bypassar RLS quando necessário.
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('🔥 Erro: Variáveis de ambiente SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias no backend/.env');
  process.exit(1); // Interrompe a execução se as chaves não estiverem definidas
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;