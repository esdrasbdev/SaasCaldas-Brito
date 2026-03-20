/*
 * Cliente Supabase Global
 * Inicializa a conexão usando as variáveis injetadas por js/env.js
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Carrega configurações ou usa placeholders para evitar crash imediato do JS
const env = window._env || {};
if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
  console.warn('⚠️ Supabase: js/env.js não carregado ou chaves ausentes.');
}

const supabaseUrl = env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = env.SUPABASE_ANON_KEY || 'placeholder';

// Cria instância oficial
export const supabase = createClient(supabaseUrl, supabaseKey);

// Compatibilidade para chamadas que esperam uma Promise de inicialização (ex: login.html)
export async function initSupabase() {
  return supabase;
}

// Torna global para debug
window.supabase = supabase;
