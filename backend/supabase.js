/*
 * Configuração do Cliente Supabase para o Backend (Node.js)
 * Utiliza a SERVICE_ROLE_KEY para permissões administrativas (burlar RLS quando necessário)
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey || supabaseUrl.includes('seu-id-projeto')) {
  console.error('❌ ERRO DE CONFIGURAÇÃO: O Supabase não está configurado corretamente no .env do backend.');
  console.error('Certifique-se de que:');
  console.error('1. SUPABASE_URL contém a URL real do seu projeto (ex: https://abc.supabase.co)');
  console.error('2. SUPABASE_SERVICE_ROLE_KEY foi preenchida corretamente.');
  console.error('\nDica: Verifique os valores no arquivo TODO.md na raiz do projeto.');
  process.exit(1);
}

// Cliente com privilégios elevados (Service Role)
module.exports = createClient(supabaseUrl, supabaseServiceKey);