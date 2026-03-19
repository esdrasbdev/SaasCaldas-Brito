/*
 * Cliente Supabase para o Frontend
 * Usa a ANON_KEY (pública)
 */
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Substitua abaixo pelas suas chaves do Supabase (Settings > API)
const supabaseUrl = 'https://xogyvlhgtznffapbpovq.supabase.co';

// ⚠️ ATENÇÃO: Sua chave anterior estava inválida/corrompida.
// Vá no Supabase > Project Settings > API > Copie a chave "anon" e cole abaixo:
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvZ3l2bGhndHpuZmZhcGJwb3ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MjAyMjksImV4cCI6MjA4OTM5NjIyOX0.Dsnz3Pwyi-QvifHurtqdS3DVYtqH4NeOfVuNs-PdSqM'; // ✅ Real anon key

export const supabase = createClient(supabaseUrl, supabaseKey);

// Compatibilidade para scripts que não usam import
window.supabase = supabase;