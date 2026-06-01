/*
 * Script de Diagnóstico - Cole no Console (F12) para debug
 */

async function diagnosticar() {
  console.clear();
  console.log('=== DIAGNÓSTICO DO SISTEMA ===\n');

  // 1. Verifica se window._env existe
  console.log('1. window._env:');
  if (window._env) {
    console.log('   ✅ window._env existe');
    console.log('   URL:', window._env.SUPABASE_URL ? '✅ Presente' : '❌ Ausente');
    console.log('   KEY:', window._env.SUPABASE_ANON_KEY ? '✅ Presente' : '❌ Ausente');
  } else {
    console.log('   ❌ window._env NÃO EXISTE - /js/env.js não foi carregado!');
  }

  // 2. Verifica se supabase foi inicializado
  console.log('\n2. Supabase Client:');
  try {
    const { supabase } = await import('./supabase.js');
    if (supabase) {
      console.log('   ✅ Supabase inicializado');
      
      // Tenta obter sessão
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('   ✅ Usuário autenticado:', session.user.email);
        console.log('   Token:', session.access_token.substring(0, 20) + '...');
      } else {
        console.log('   ⚠️ Nenhum usuário autenticado');
      }
    } else {
      console.log('   ❌ Supabase é NULL');
    }
  } catch (e) {
    console.log('   ❌ Erro ao carregar supabase:', e.message);
  }

  // 3. Verifica localStorage
  console.log('\n3. LocalStorage:');
  console.log('   userRole:', localStorage.getItem('userRole') || '❌ Não encontrado');
  console.log('   supabaseToken:', localStorage.getItem('supabaseToken') ? '✅ Presente' : '❌ Ausente');
  console.log('   userName:', localStorage.getItem('userName') || '❌ Não encontrado');

  // 4. Verifica conexão com Backend
  console.log('\n4. Backend (http://localhost:3001/health):');
  try {
    const res = await fetch('http://localhost:3001/health');
    if (res.ok) {
      const data = await res.json();
      console.log('   ✅ Backend respondendo:', data);
    } else {
      console.log('   ❌ Backend retornou status', res.status);
    }
  } catch (e) {
    console.log('   ❌ Não conseguiu conectar:', e.message);
  }

  // 5. Tenta carregar dados de exemplo
  console.log('\n5. Testando Query (Clientes):');
  try {
    const { supabase } = await import('./supabase.js');
    if (supabase) {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .limit(1);
      
      if (error) {
        console.log('   ❌ Erro:', error.message);
        console.log('   Código:', error.code);
      } else {
        console.log('   ✅ Query funciona! Retornou', data.length, 'registros');
      }
    }
  } catch (e) {
    console.log('   ❌ Erro:', e.message);
  }

  console.log('\n=== FIM DO DIAGNÓSTICO ===');
  console.log('\nRECOMENDAÇÕES:');
  console.log('- Se window._env está vazio, o /js/env.js não foi carregado');
  console.log('- Se Supabase é NULL, window._env estava vazio');
  console.log('- Se Backend está offline, inicie com: npm run dev (na pasta backend)');
  console.log('- Se não há token, faça login em login.html');
}

// Executa diagnostico
diagnosticar();
