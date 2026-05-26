/*
 * Cliente Supabase Global
 * Inicializa a conexão usando as variáveis injetadas por js/env.js
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Carrega configurações ou usa placeholders para evitar crash imediato do JS
const env = window._env || window.env || {};
if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
  console.error('CRÍTICO: Supabase URL ou Anon Key não encontradas no ambiente (js/env.js).');
}

if (!env.SUPABASE_URL || env.SUPABASE_URL.includes('SUA-URL')) {
  console.warn('AVISO: Você ainda não configurou as chaves reais do Supabase no arquivo js/env.js');
}

const supabaseUrl = env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_ANON_KEY;

// Cria instância oficial (só se estiver configurado)
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseKey && !supabaseUrl.includes('SUA-URL'));

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseKey)
  : // Fallback seguro: evita crash imediato. Chamadas vão falhar claramente no console.
    createClient('https://example.supabase.co', 'example');


// Helper para obter a URL base da API (Backend)
export const getApiUrl = () => {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001/api'
    : '/api'; // Na Vercel, usamos caminhos relativos para a mesma URL
};

// Compatibilidade para chamadas que esperam uma Promise de inicialização (ex: login.html)
export async function initSupabase() {
  return supabase;
}

// Torna global para debug
window.supabase = supabase;
