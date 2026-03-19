/*
 * Lógica para a página de Audiências
 * - Carrega audiências do banco
 * - Popula select de processos
 * - Salva novas audiências
 */

import { supabase } from './supabase.js';
import { AuthAPI } from './auth.js';

const formContainer = document.getElementById('form-container');
const btnNovaAudiencia = document.getElementById('btn-nova-audiencia');
const btnCancelar = document.getElementById('btn-cancelar');
const formAudiencia = document.getElementById('form-audiencia');
const processoSelect = document.getElementById('processo-select');
const listaAudiencias = document.getElementById('lista-audiencias');

// Mostra/esconde o formulário
btnNovaAudiencia.addEventListener('click', () => {
  formContainer.style.display = 'flex';
});

btnCancelar.addEventListener('click', () => {
  formContainer.style.display = 'none';
  formAudiencia.reset();
});

// Carrega processos para o dropdown
async function carregarProcessos() {
  const { data, error } = await supabase
    .from('processos')
    .select('id, numero_cnj, clientes(nome)')
    .order('criado_em', { ascending: false });

  if (error) {
    console.error('Erro ao carregar processos:', error);
    return;
  }

  processoSelect.innerHTML = '<option value="">Selecione um processo</option>';
  data.forEach(p => {
    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = `${p.numero_cnj || 'S/N'} - ${p.clientes?.nome || 'Cliente não vinculado'}`;
    processoSelect.appendChild(option);
  });
}

// Carrega e exibe as audiências na tabela
async function carregarAudiencias() {
  const isAdmin = AuthAPI.getRole() === 'ADMIN';
  const { data, error } = await supabase
    .from('audiencias')
    .select('*, processos(numero_cnj)')
    .order('data', { ascending: true });

  if (error) {
    console.error('Erro ao carregar audiências:', error);
    listaAudiencias.innerHTML = `<tr><td colspan="5" class="text-center">Erro ao carregar dados.</td></tr>`;
    return;
  }

  if (data.length === 0) {
    listaAudiencias.innerHTML = `<tr><td colspan="5" class="text-center">Nenhuma audiência cadastrada.</td></tr>`;
    return;
  }

  listaAudiencias.innerHTML = data.map(aud => `
    <tr>
      <td>${aud.processos?.numero_cnj || 'N/A'}</td>
      <td>${new Date(aud.data).toLocaleString('pt-BR')}</td>
      <td>${aud.local}</td>
      <td>${aud.tipo}</td>
      <td>${isAdmin ? `<button class="btn-sm btn-delete" data-id="${aud.id}" style="color: #ef4444;">Excluir</button>` : ''}</td>
    </tr>
  `).join('');
}

// Salva uma nova audiência
formAudiencia.addEventListener('submit', async (e) => {
  e.preventDefault();

  const novaAudiencia = {
    processo_id: document.getElementById('processo-select').value,
    data: document.getElementById('audiencia-data').value,
    local: document.getElementById('audiencia-local').value,
    tipo: document.getElementById('audiencia-tipo').value,
    observacoes: document.getElementById('audiencia-obs').value,
  };

  const { error } = await supabase.from('audiencias').insert(novaAudiencia);

  if (error) {
    console.error('Erro ao salvar audiência:', error);
    alert('Não foi possível salvar a audiência.');
  } else {
    alert('Audiência salva com sucesso!');
    formAudiencia.reset();
    formContainer.style.display = 'none';
    carregarAudiencias(); // Recarrega a lista
  }
});

// Inicialização da página
document.addEventListener('DOMContentLoaded', () => {
  carregarProcessos();
  carregarAudiencias();
  
  // Event listener para botões de exclusão
  listaAudiencias.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-delete');
    if (btn && confirm('Tem certeza que deseja excluir esta audiência?')) {
      const { error } = await supabase.from('audiencias').delete().eq('id', btn.dataset.id);
      if (error) {
        alert('Erro ao excluir: ' + error.message);
      } else {
        carregarAudiencias();
      }
    }
  });
});