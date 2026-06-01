/*
 * Cliente Supabase Global
 * Inicializa a conexão usando as variáveis injetadas por js/env.js
 */

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

async function ensureEnv() {
  // Se backend já injetou window._env, usa direto
  if (
    window._env &&
    typeof window._env.SUPABASE_URL === 'string' &&
    typeof window._env.SUPABASE_ANON_KEY === 'string' &&
    window._env.SUPABASE_URL &&
    window._env.SUPABASE_ANON_KEY
  ) {
    // Evita seguir com placeholders
    if (window._env.SUPABASE_URL.includes('SUA-URL')) {
      throw new Error('CRÍTICO: window._env.SUPABASE_URL contém placeholder SUA-URL.');
    }
    if (window._env.SUPABASE_ANON_KEY.includes('SUA-ANON-KEY')) {
      throw new Error('CRÍTICO: window._env.SUPABASE_ANON_KEY contém placeholder SUA-ANON-KEY.');
    }
    return;
  }

  const local = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const candidateUrls = local
    ? ['http://localhost:3001/js/env.js', 'http://localhost:3001/js-env.js', '/js/env.js']
    : ['/js/env.js', '/js-env.js', 'https://saas-caldas-brito.vercel.app/js/env.js'];

  let res = null;
  let lastErr = null;
  for (const candidate of candidateUrls) {
    try {
      const r = await fetch(candidate, { cache: 'no-store' });
      if (r.ok) {
        res = r;
        break;
      }
      lastErr = new Error(`HTTP ${r.status}`);
    } catch (e) {
      lastErr = e;
    }
  }
  if (!res) {
    throw new Error(`Falha ao carregar js/env.js para Supabase. ${lastErr ? lastErr.message : ''}`);
  }

  if (!res.ok) {
    throw new Error(`Falha ao carregar js/env.js para Supabase. HTTP ${res.status} (${url})`);
  }

  const txt = await res.text();
  if (!txt || !txt.includes('SUPABASE_URL') || !txt.includes('SUPABASE_ANON_KEY')) {
    throw new Error(`js/env.js inválido (conteúdo não contém SUPABASE_URL/SUPABASE_ANON_KEY) (${url})`);
  }

  // eslint-disable-next-line no-eval
  eval(txt);

  if (
    !window._env ||
    typeof window._env.SUPABASE_URL !== 'string' ||
    typeof window._env.SUPABASE_ANON_KEY !== 'string' ||
    !window._env.SUPABASE_URL ||
    !window._env.SUPABASE_ANON_KEY
  ) {
    throw new Error('js/env.js carregou mas não injetou window._env com SUPABASE_URL/SUPABASE_ANON_KEY');
  }
}

const showSupabaseInitError = (title, details) => {
  try {
    let el = document.getElementById('supabase-init-error');
    if (!el) {
      el = document.createElement('div');
      el.id = 'supabase-init-error';
      el.style.cssText = [
        'position:fixed',
        'top:16px',
        'left:16px',
        'right:16px',
        'z-index:99999',
        'background:#111827',
        'color:#fff',
        'padding:14px 16px',
        'border:1px solid #ef4444',
        'border-radius:10px',
        'font-family:ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial'
      ].join(';');
      document.body.appendChild(el);
    }

    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
        <div>
          <div style="font-weight:800; font-size:14px; color:#f87171; margin-bottom:6px;">${title}</div>
          <div style="font-size:12px; line-height:1.35; color:#e5e7eb; white-space:pre-wrap;">${details || ''}</div>
        </div>
        <button id="supabase-init-error-close" style="background:transparent; border:0; color:#fff; cursor:pointer; font-size:18px;">×</button>
      </div>
    `;

    const closeBtn = document.getElementById('supabase-init-error-close');
    if (closeBtn) closeBtn.onclick = () => {
      el && el.remove();
    };
  } catch (_) {
    // ignore
  }
};

let supabaseUrl = null;
let supabaseKey = null;

try {
  await ensureEnv();

  supabaseUrl = window._env?.SUPABASE_URL;
  supabaseKey = window._env?.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('CRÍTICO: Supabase URL ou Anon Key não encontradas (js/env.js vazio ou não carregado).');
  }

  if (supabaseUrl.includes('SUA-URL')) {
    throw new Error('CRÍTICO: SUPABASE_URL ainda contém placeholder (SUA-URL). Configure no js/env.js/backend env.');
  }
} catch (err) {
  const msg = err?.message || String(err);
  console.error('Supabase init error:', err);
  showSupabaseInitError('Supabase falhou ao inicializar', msg);
  // Mantém supabase como null para não quebrar import.
}

export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Diagnóstico: garante que o módulo foi inicializado
try {
  console.log('[supabase] init:', {
    urlPresent: !!supabaseUrl,
    keyPresent: !!supabaseKey,
    supabaseObjectPresent: !!supabase
  });
} catch (_) {}




// Helper para obter a URL base da API (Backend)
export const getApiUrl = () => {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3001/api'
    : '/api';
};

// Compatibilidade para chamadas que esperam uma Promise de inicialização (ex: login.html)
export async function initSupabase() {
  return supabase;
}

// Torna global para debug
window.supabase = supabase;

