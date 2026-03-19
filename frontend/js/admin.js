/*
 * Lógica para a página de Configurações (Admin)
 * - Carrega usuários existentes
 * - Permite convidar novos usuários
 */

import { supabase } from './supabase.js';

const formConvite = document.getElementById('form-convite');
const listaUsuarios = document.getElementById('lista-usuarios');

// Carrega e exibe os usuários na tabela
async function carregarUsuarios() {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .order('nome', { ascending: true });

  if (error) {
    console.error('Erro ao carregar usuários:', error);
    listaUsuarios.innerHTML = `<tr><td colspan="4" class="text-center">Erro ao carregar dados.</td></tr>`;
    return;
  }

  if (data.length === 0) {
    listaUsuarios.innerHTML = `<tr><td colspan="4" class="text-center">Nenhum usuário cadastrado.</td></tr>`;
    return;
  }

  listaUsuarios.innerHTML = data.map(user => `
    <tr>
      <td>${user.nome}</td>
      <td>${user.email}</td>
      <td><span class="status-badge status-ativo">${user.role}</span></td>
      <td>${user.ativo ? 'Ativo' : 'Inativo'}</td>
    </tr>
  `).join('');
}

// Envia convite para novo usuário
formConvite.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nome = document.getElementById('usuario-nome').value;
  const email = document.getElementById('usuario-email').value;
  const role = document.getElementById('usuario-role').value;

  // 1. Envia o convite via Supabase Auth (Admin)
  // Isso cria o usuário na aba "Authentication" e envia o e-mail de convite
  const { data, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email);

  if (inviteError) {
    console.error('Erro ao convidar usuário:', inviteError);
    alert(`Erro ao enviar convite: ${inviteError.message}`);
    return;
  }

  // 2. Insere o usuário na tabela 'usuarios' para definir a permissão (role)
  // O usuário só conseguirá usar o sistema após aceitar o convite e definir a senha
  const { error: dbError } = await supabase.from('usuarios').insert({
    id: data.user.id, // Usa o ID retornado pelo convite
    nome: nome,
    email: email,
    role: role,
    ativo: true
  });

  if (dbError) {
    // Se der erro aqui, o ideal seria deletar o convite, mas por simplicidade
    // apenas avisamos o admin.
    console.error('Erro ao salvar permissão do usuário:', dbError);
    alert(`Convite enviado, mas houve um erro ao salvar as permissões: ${dbError.message}. Peça para o usuário tentar o login e contate o suporte se o problema persistir.`);
    return;
  }

  alert('Convite enviado com sucesso!');
  formConvite.reset();
  carregarUsuarios(); // Recarrega a lista para mostrar o novo usuário
});

// Inicialização da página
document.addEventListener('DOMContentLoaded', () => {
  carregarUsuarios();
});