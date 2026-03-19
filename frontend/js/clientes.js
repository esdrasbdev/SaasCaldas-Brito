/*
 * Módulo Clientes - Arquitetura MVC
 * Separação clara entre Dados (Supabase), Interface (DOM) e Regras de Negócio
 */

import { supabase } from './supabase.js';
import { AuthAPI } from './auth.js';

// ==========================================
// 1. MODEL (Gerencia Dados e Banco)
// ==========================================
const ClienteModel = {
  async listarTodos() {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nome', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  async buscarPorId(id) {
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async criar(cliente) {
    const { data, error } = await supabase
      .from('clientes')
      .insert([cliente])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async atualizar(id, dados) {
    const { data, error } = await supabase
      .from('clientes')
      .update(dados)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deletar(id) {
    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  }
};

// ==========================================
// 2. VIEW (Gerencia o HTML e Exibição)
// ==========================================
const ClienteView = {
  elementos: {
    tabelaContainer: document.getElementById('view-tabela-container'),
    modal: document.getElementById('modal-container'),
    form: document.getElementById('form-cliente'),
    tituloModal: document.getElementById('modal-titulo'),
    btnNovo: document.getElementById('btn-novo-cliente'),
    btnCancelar: document.getElementById('btn-cancelar'),
    inputBusca: null // Criado dinamicamente
  },

  init() {
    // Renderiza estrutura base da tabela com busca
    this.elementos.tabelaContainer.innerHTML = `
      <div class="card-section">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2>Base de Clientes</h2>
          <input type="text" id="busca-cliente" placeholder="Buscar por nome ou CPF..." style="max-width: 300px;">
        </div>
        <div class="table-responsive">
          <table class="recent-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Documento</th>
                <th>Contato</th>
                <th style="text-align: right;">Ações</th>
              </tr>
            </thead>
            <tbody id="lista-clientes-body">
              <tr><td colspan="4" class="text-center">Carregando...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
    this.elementos.inputBusca = document.getElementById('busca-cliente');
  },

  renderizarTabela(clientes) {
    const tbody = document.getElementById('lista-clientes-body');
    const isAdmin = AuthAPI.getRole() === 'ADMIN';
    
    if (!clientes || clientes.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center" style="padding: 30px; color: var(--cinza-medio);">
            <i class="fa-solid fa-folder-open"></i> Nenhum cliente encontrado.
          </td>
        </tr>`;
      return;
    }

    tbody.innerHTML = clientes.map(c => `
      <tr>
        <td>
          <div style="font-weight: 600; color: var(--azul-escuro);">${c.nome}</div>
          <small style="color: var(--cinza-medio);">${c.tipo === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}</small>
        </td>
        <td>${c.documento || '-'}</td>
        <td>
          <div><i class="fa-solid fa-envelope" style="font-size: 0.8em;"></i> ${c.email || '-'}</div>
          <div><i class="fa-solid fa-phone" style="font-size: 0.8em;"></i> ${c.telefone || '-'}</div>
        </td>
        <td style="text-align: right;">
          <button class="btn-sm btn-edit" data-id="${c.id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
          ${isAdmin ? `<button class="btn-sm btn-delete" data-id="${c.id}" title="Excluir" style="color: #ef4444;"><i class="fa-solid fa-trash"></i></button>` : ''}
        </td>
      </tr>
    `).join('');
  },

  abrirModal(cliente = null) {
    this.elementos.tituloModal.textContent = cliente ? 'Editar Cliente' : 'Novo Cliente';
    this.elementos.form.reset();
    document.getElementById('cliente-id').value = '';

    if (cliente) {
      document.getElementById('cliente-id').value = cliente.id;
      document.getElementById('cliente-nome').value = cliente.nome;
      document.getElementById('cliente-tipo').value = cliente.tipo || 'PF';
      document.getElementById('cliente-documento').value = cliente.documento || '';
      document.getElementById('cliente-email').value = cliente.email || '';
      document.getElementById('cliente-telefone').value = cliente.telefone || '';
      // Novos campos
      document.getElementById('cliente-nacionalidade').value = cliente.nacionalidade || '';
      document.getElementById('cliente-estado-civil').value = cliente.estado_civil || '';
      document.getElementById('cliente-profissao').value = cliente.profissao || '';
      document.getElementById('cliente-cep').value = cliente.cep || '';
      document.getElementById('cliente-endereco').value = cliente.endereco || '';
      document.getElementById('cliente-numero').value = cliente.numero || '';
      document.getElementById('cliente-bairro').value = cliente.bairro || '';
      document.getElementById('cliente-cidade').value = cliente.cidade || '';
      document.getElementById('cliente-estado').value = cliente.estado || '';
    }

    this.elementos.modal.style.display = 'flex'; // Flex para centralizar
  },

  fecharModal() {
    this.elementos.modal.style.display = 'none';
    this.elementos.form.reset();
  },

  mostrarErro(msg) {
    alert(`Erro: ${msg}`);
  }
};

// ==========================================
// 3. CONTROLLER (Regras e Eventos)
// ==========================================
const ClienteController = {
  dadosLocais: [], // Cache local para busca rápida

  async init() {
    ClienteView.init();
    this.bindEvents();
    await this.carregarDados();
  },

  bindEvents() {
    // Botão Novo
    ClienteView.elementos.btnNovo.addEventListener('click', () => {
      ClienteView.abrirModal();
    });

    // Botão Cancelar Modal
    ClienteView.elementos.btnCancelar.addEventListener('click', () => {
      ClienteView.fecharModal();
    });

    // Submit do Formulário
    ClienteView.elementos.form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.salvarCliente();
    });

    // Input de Busca (Debounce manual simples)
    ClienteView.elementos.inputBusca.addEventListener('input', (e) => {
      const termo = e.target.value.toLowerCase();
      const filtrados = this.dadosLocais.filter(c => 
        c.nome.toLowerCase().includes(termo) || 
        (c.documento && c.documento.includes(termo))
      );
      ClienteView.renderizarTabela(filtrados);
    });

    // Delegação de eventos para botões dinâmicos (Editar/Excluir)
    document.getElementById('lista-clientes-body').addEventListener('click', async (e) => {
      const btnEdit = e.target.closest('.btn-edit');
      const btnDelete = e.target.closest('.btn-delete');

      if (btnEdit) {
        const id = btnEdit.dataset.id;
        const cliente = this.dadosLocais.find(c => c.id === id);
        if (cliente) ClienteView.abrirModal(cliente);
      }

      if (btnDelete) {
        const id = btnDelete.dataset.id;
        if (confirm('Tem certeza que deseja excluir este cliente?')) {
          await this.excluirCliente(id);
        }
      }
    });
  },

  async carregarDados() {
    try {
      this.dadosLocais = await ClienteModel.listarTodos();
      ClienteView.renderizarTabela(this.dadosLocais);
    } catch (error) {
      console.error(error);
      ClienteView.mostrarErro('Falha ao carregar clientes.');
    }
  },

  async salvarCliente() {
    const id = document.getElementById('cliente-id').value;
    const dados = {
      nome: document.getElementById('cliente-nome').value,
      tipo: document.getElementById('cliente-tipo').value,
      documento: document.getElementById('cliente-documento').value,
      email: document.getElementById('cliente-email').value,
      telefone: document.getElementById('cliente-telefone').value,
      nacionalidade: document.getElementById('cliente-nacionalidade').value,
      estado_civil: document.getElementById('cliente-estado-civil').value,
      profissao: document.getElementById('cliente-profissao').value,
      cep: document.getElementById('cliente-cep').value,
      endereco: document.getElementById('cliente-endereco').value,
      numero: document.getElementById('cliente-numero').value,
      bairro: document.getElementById('cliente-bairro').value,
      cidade: document.getElementById('cliente-cidade').value,
      estado: document.getElementById('cliente-estado').value
    };

    try {
      if (id) {
        await ClienteModel.atualizar(id, dados);
      } else {
        await ClienteModel.criar(dados);
      }
      ClienteView.fecharModal();
      await this.carregarDados(); // Recarrega para garantir consistência
    } catch (error) {
      console.error(error);
      ClienteView.mostrarErro('Falha ao salvar. Verifique se o CPF/CNPJ já existe.');
    }
  },

  async excluirCliente(id) {
    try {
      await ClienteModel.deletar(id);
      await this.carregarDados();
    } catch (error) {
      console.error(error);
      ClienteView.mostrarErro('Não foi possível excluir (pode haver processos vinculados).');
    }
  }
};

// Inicializa o módulo quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  ClienteController.init();
});