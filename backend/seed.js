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
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.pass,
      email_confirm: true,
      user_metadata: { nome: u.nome }
    });

    let userId = authData?.user?.id;

    if (authError) {
      if (authError.message.includes('already registered')) {
        // Se já existe no Auth, precisamos buscar o ID dele
        const { data: list } = await supabase.auth.admin.listUsers();
        const existing = list.users.find(au => au.email.toLowerCase() === u.email.toLowerCase());
        userId = existing?.id;
      } else {
        console.error(`Erro Auth [${u.email}]:`, authError.message);
        continue;
      }
    }

    // 2. Criar Permissões (Tabela Publica)
    if (userId) {
      // Remove qualquer registro antigo com este e-mail que tenha ID diferente
      // Isso limpa o "lixo" gerado pelo script SQL antes de inserir o correto
      await supabase
        .from('usuarios')
        .delete()
        .eq('email', u.email.toLowerCase())
        .neq('id', userId);

      const { error: dbError } = await supabase.from('usuarios').upsert({
        id: userId, // Vínculo crucial: usa o ID do Auth
        nome: u.nome,
        email: u.email.toLowerCase(), // Normaliza para minúsculas
        role: u.role,
        ativo: true
      }, { onConflict: 'email' });

      if (dbError) console.error(`Erro DB [${u.email}]:`, dbError.message);
    }
  }
  
  console.log('✅ Usuários prontos: antonio@escritorio.com.br / admin123');
}

module.exports = seedUsers;