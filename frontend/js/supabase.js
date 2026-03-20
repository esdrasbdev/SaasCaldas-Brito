/*
 * Cliente Supabase para o Frontend
 * Usa a ANON_KEY (pública)
 */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Substitua abaixo pelas suas chaves do Supabase (Settings > API)
const supabaseUrl = 'https://xogyvlhgtznffapbpovq.supabase.co';

// ⚠️ SEGURANÇA CRÍTICA:
// Cole abaixo APENAS a chave "anon" / "public" do Supabase.
// NUNCA cole a chave "service_role" aqui. Se o GitGuardian alertou, você colou a service_role ou comitou o .env.
const supabaseKey = 'COLE_SUA_NOVA_CHAVE_ANON_AQUI'; 

export const supabase = createClient(supabaseUrl, supabaseKey);

// Compatibilidade para scripts que não usam import
window.supabase = supabase;