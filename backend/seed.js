/*
 * Script para garantir que os usuários padrão existam
 * Roda automaticamente ao iniciar o backend
 */
const supabase = require('./supabase.js');

async function seedUsers() {
  const users = [
    { nome: 'Antonio', email: 'antonio@escritorio.com.br', pass: 'admin123', role: 'ADMIN' },
    { nome: 'Priscila', email: 'priscila@escritorio.com.br', pass: 'admin123', role: 'ADMIN' }
  ];

  console.log('🌱 Verificando usuários padrão (Seed)...');

  for (const u of users) {
    // 1. Criar Login (Supabase Auth)
    // Usa a API de Admin para criar já confirmado e sem enviar email
    const { error: authError } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.pass,
      email_confirm: true,
      user_metadata: { nome: u.nome }
    });

    if (authError && !authError.message.includes('already registered')) {
      console.error(`Erro Auth [${u.email}]:`, authError.message);
    }

    // 2. Criar Permissões (Tabela Publica)
    // Garante que o usuário tenha a role ADMIN para acessar o sistema
    const { error: dbError } = await supabase.from('usuarios').upsert({
      nome: u.nome,
      email: u.email,
      role: u.role,
      ativo: true
    }, { onConflict: 'email' });

    if (dbError) console.error(`Erro DB [${u.email}]:`, dbError.message);
  }
  
  console.log('✅ Usuários prontos: antonio@escritorio.com.br / admin123');
}

module.exports = seedUsers;