/*
 * Lógica para a página de Perícias
 * - Carrega perícias do banco
 * - Popula select de processos
 * - Salva novas perícias
 */

import { supabase } from './supabase.js';
import { AuthAPI } from './auth.js';
import { showToast } from './utils.js';

const formContainer = document.getElementById('form-container');
const btnNovaPericia = document.getElementById('btn-nova-pericia');
const btnCancelar = document.getElementById('btn-cancelar');
const formPericia = document.getElementById('form-pericia');
const processoSelect = document.getElementById('processo-select');
const listaPericias = document.getElementById('lista-pericias');

// Mostra/esconde o formulário
btnNovaPericia.addEventListener('click', () => {
  formContainer.style.display = 'flex';
  // Reseta para modo edição/criação
  formPericia.reset();
  document.querySelector('#form-pericia button[type="submit"]').style.display = 'block';
  const inputs = formPericia.querySelectorAll('input, select');
  inputs.forEach(el => el.disabled = false);
  document.querySelector('.modal-header h2').textContent = 'Agendar Nova Perícia';
});

btnCancelar.addEventListener('click', () => {
  formContainer.style.display = 'none';
  formPericia.reset();
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

// Carrega e exibe as perícias na tabela
async function carregarPericias() {
  const isAdmin = AuthAPI.getRole() === 'ADMIN';
  const { data, error } = await supabase
    .from('pericias')
    .select('*, processos(numero_cnj)')
    .order('data', { ascending: true });

  if (error) {
    console.error('Erro ao carregar perícias:', error);
    listaPericias.innerHTML = `<tr><td colspan="5" class="text-center">Erro ao carregar dados.</td></tr>`;
    return;
  }

  if (data.length === 0) {
    listaPericias.innerHTML = `<tr><td colspan="5" class="text-center">Nenhuma perícia cadastrada.</td></tr>`;
    return;
  }

  listaPericias.innerHTML = data.map(p => `
    <tr>
      <td>${p.processos?.numero_cnj || 'N/A'}</td>
      <td>${new Date(p.data).toLocaleString('pt-BR')}</td>
      <td>${p.local}</td>
      <td>${p.perito || 'Não informado'}</td>
      <td>
        <button class="btn-sm btn-view" data-id="${p.id}" title="Visualizar"><i class="fa-solid fa-eye"></i></button>
        ${isAdmin ? `<button class="btn-sm btn-delete" data-id="${p.id}" title="Excluir" style="color: #ef4444;"><i class="fa-solid fa-trash"></i></button>` : ''}
      </td>
    </tr>
  `).join('');
}

// Salva uma nova perícia
formPericia.addEventListener('submit', async (e) => {
  e.preventDefault();

  const novaPericia = {
    processo_id: document.getElementById('processo-select').value,
    data: document.getElementById('pericia-data').value,
    local: document.getElementById('pericia-local').value,
    perito: document.getElementById('pericia-perito').value,
  };

  if (!novaPericia.processo_id || !novaPericia.data) {
    showToast('Preencha o processo e a data.', 'warning');
    return;
  }

  const { error } = await supabase.from('pericias').insert(novaPericia);

  if (error) {
    console.error('Erro ao salvar perícia:', error);
    showToast('Não foi possível salvar a perícia.', 'error');
  } else {
    showToast('Perícia agendada com sucesso!', 'success');
    formPericia.reset();
    formContainer.style.display = 'none';
    carregarPericias();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  carregarProcessos();
  carregarPericias();
  
  // Event listener para ações
  listaPericias.addEventListener('click', async (e) => {
    // Visualizar
    const btnView = e.target.closest('.btn-view');
    if (btnView) {
      const id = btnView.dataset.id;
      const { data, error } = await supabase.from('pericias').select('*').eq('id', id).single();
      
      if (!error && data) {
        document.getElementById('processo-select').value = data.processo_id;
        
        const date = new Date(data.data);
        const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        document.getElementById('pericia-data').value = localDate;
        
        document.getElementById('pericia-local').value = data.local;
        document.getElementById('pericia-perito').value = data.perito;

        // Trava campos
        const inputs = formPericia.querySelectorAll('input, select');
        inputs.forEach(el => el.disabled = true);
        document.querySelector('#form-pericia button[type="submit"]').style.display = 'none';
        document.querySelector('.modal-header h2').textContent = 'Detalhes da Perícia';
        
        formContainer.style.display = 'flex';
      }
    }

    // Excluir
    const btn = e.target.closest('.btn-delete');
    if (btn && confirm('Tem certeza que deseja excluir esta perícia?')) {
      const { error } = await supabase.from('pericias').delete().eq('id', btn.dataset.id);
      if (error) {
        showToast('Erro ao excluir: ' + error.message, 'error');
      } else {
        carregarPericias();
      }
    }
  });
});