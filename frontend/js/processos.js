/*
 * Módulo Processos - Arquitetura MVC
 */

import { supabase } from './supabase.js';
import { AuthAPI } from './auth.js';

// ==========================================
// 1. MODEL
// ==========================================
const ProcessoModel = {
  async listarTodos() {
    // Busca processos trazendo dados do cliente relacionado
    const { data, error } = await supabase
      .from('processos')
      .select('*, clientes(nome)')
      .order('criado_em', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async deletar(id) {
    const { error } = await supabase
      .from('processos')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  async criar(processo) {
    const { error } = await supabase
      .from('processos')
      .insert([processo]);
    if (error) throw error;
    return true;
  }
};

// ==========================================
// 2. VIEW
// ==========================================
const ProcessoView = {
  container: document.getElementById('view-processos-container'),
  modal: document.getElementById('modal-container'),
  form: document.getElementById('form-processo'),
  btnNovo: document.getElementById('btn-novo-processo'),
  btnCancelar: document.getElementById('btn-cancelar'),

  init() {
    this.container.innerHTML = `
      <div class="card-section">
        <div style="display: flex; gap: 16px; margin-bottom: 20px; flex-wrap: wrap;">
          <div style="flex: 1;">
            <input type="text" id="busca-processo" placeholder="Buscar por CNJ, Cliente ou Vara...">
          </div>
          <div style="width: 200px;">
            <select id="filtro-status">
              <option value="">Todos os Status</option>
              <option value="ATIVO">Ativos</option>
              <option value="ARQUIVADO">Arquivados</option>
              <option value="SUSPENSO">Suspensos</option>
            </select>
          </div>
        </div>

        <div class="table-responsive">
          <table class="recent-table">
            <thead>
              <tr>
                <th>Processo / Cliente</th>
                <th>Tribunal / Vara</th>
                <th>Status</th>
                <th>Criação</th>
                <th style="text-align: right;">Ações</th>
              </tr>
            </thead>
            <tbody id="lista-processos-body">
              <tr><td colspan="5" class="text-center">Carregando processos...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderizarTabela(processos) {
    const tbody = document.getElementById('lista-processos-body');
    const isAdmin = AuthAPI.getRole() === 'ADMIN';
    
    if (!processos || processos.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center" style="padding: 40px; color: var(--cinza-medio);">
            <i class="fa-solid fa-folder-open fa-2x" style="margin-bottom: 10px;"></i><br>
            Nenhum processo encontrado.
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = processos.map(p => `
      <tr>
        <td>
          <div style="font-weight: 600; color: var(--azul-escuro);">${p.clientes?.nome || 'Sem Cliente'}</div>
          <small style="color: var(--cinza-medio); font-family: monospace;">${p.numero_cnj || 'S/N'}</small>
        </td>
        <td>
          <div>${p.tribunal || '-'}</div>
          <small style="color: var(--cinza-medio);">${p.vara || '-'}</small>
        </td>
        <td>
          <span class="status-badge ${p.status === 'ATIVO' ? 'status-ativo' : 'status-arquivado'}">
            ${p.status || 'INDEFINIDO'}
          </span>
        </td>
        <td>${new Date(p.criado_em).toLocaleDateString('pt-BR')}</td>
        <td style="text-align: right;">
          <a href="processo-detalhe.html?id=${p.id}" class="btn-sm" title="Ver Detalhes"><i class="fa-solid fa-eye"></i></a>
          ${isAdmin ? `<button class="btn-sm btn-delete" data-id="${p.id}" title="Excluir" style="color: #ef4444;"><i class="fa-solid fa-trash"></i></button>` : ''}
        </td>
      </tr>
    `).join('');
  },

  mostrarErro(msg) {
    alert(msg);
  },

  abrirModal() {
    this.modal.style.display = 'flex';
  },

  fecharModal() {
    this.modal.style.display = 'none';
    this.form.reset();
  },

  preencherSelectClientes(clientes) {
    const select = document.getElementById('proc-cliente');
    select.innerHTML = '<option value="">Selecione um cliente</option>' + 
      clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
  }
};

// ==========================================
// 3. CONTROLLER
// ==========================================
const ProcessoController = {
  dadosLocais: [],

  async init() {
    ProcessoView.init();
    this.bindEvents();
    await this.carregarDados();
    await this.carregarClientesSelect();
  },

  bindEvents() {
    const inputBusca = document.getElementById('busca-processo');
    const selectFiltro = document.getElementById('filtro-status');

    // Modal Events
    ProcessoView.btnNovo.addEventListener('click', () => ProcessoView.abrirModal());
    ProcessoView.btnCancelar.addEventListener('click', () => ProcessoView.fecharModal());
    
    ProcessoView.form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await ProcessoModel.criar({
          numero_cnj: document.getElementById('proc-cnj').value,
          tribunal: document.getElementById('proc-tribunal').value,
          vara: document.getElementById('proc-vara').value,
          cliente_id: document.getElementById('proc-cliente').value
        });
        ProcessoView.fecharModal();
        await this.carregarDados();
      } catch(err) { alert('Erro ao criar: ' + err.message); }
    });

    const filtrar = () => {
      const termo = inputBusca.value.toLowerCase();
      const status = selectFiltro.value;

      const filtrados = this.dadosLocais.filter(p => {
        const matchTexto = 
          (p.numero_cnj && p.numero_cnj.toLowerCase().includes(termo)) ||
          (p.clientes?.nome && p.clientes.nome.toLowerCase().includes(termo)) ||
          (p.vara && p.vara.toLowerCase().includes(termo));
        
        const matchStatus = status ? p.status === status : true;

        return matchTexto && matchStatus;
      });

      ProcessoView.renderizarTabela(filtrados);
    };

    inputBusca.addEventListener('input', filtrar);
    selectFiltro.addEventListener('change', filtrar);

    document.getElementById('lista-processos-body').addEventListener('click', async (e) => {
      const btnDelete = e.target.closest('.btn-delete');
      if (btnDelete) {
        const id = btnDelete.dataset.id;
        if (confirm('Tem certeza? Isso apagará o processo e históricos relacionados.')) {
          await this.deletarProcesso(id);
        }
      }
    });
  },

  async carregarDados() {
    try {
      this.dadosLocais = await ProcessoModel.listarTodos();
      ProcessoView.renderizarTabela(this.dadosLocais);
    } catch (error) {
      console.error(error);
      ProcessoView.mostrarErro('Erro ao carregar processos.');
    }
  },
  
  async carregarClientesSelect() {
    const { data } = await supabase.from('clientes').select('id, nome').order('nome');
    if(data) ProcessoView.preencherSelectClientes(data);
  },

  async deletarProcesso(id) {
    try {
      await ProcessoModel.deletar(id);
      await this.carregarDados();
    } catch (error) {
      console.error(error);
      ProcessoView.mostrarErro('Erro ao deletar. Verifique se há vínculos.');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  ProcessoController.init();
});