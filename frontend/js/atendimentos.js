import { supabase } from './supabase.js';
import { AuthAPI } from './auth.js';

const view = {
  container: document.getElementById('lista-atendimentos-container'),
  modal: document.getElementById('modal-atendimento'),
  form: document.getElementById('form-atendimento'),
  btnNovo: document.getElementById('btn-novo-atendimento'),
  btnCancelar: document.getElementById('btn-cancelar'),
  selectCliente: document.getElementById('atend-cliente'),
  
  init() {
    this.btnNovo.onclick = () => this.modal.style.display = 'flex';
    this.btnCancelar.onclick = () => this.modal.style.display = 'none';
    this.form.onsubmit = controller.salvar;
    
    this.container.addEventListener('click', controller.handleClick);
  },

  renderizar(dados) {
    const isAdmin = AuthAPI.getRole() === 'ADMIN';
    if (!dados || dados.length === 0) {
      this.container.innerHTML = `<div class="card-section"><p class="text-center text-muted">Nenhum atendimento registrado.</p></div>`;
      return;
    }
    
    let html = `<div class="card-section"><div class="table-responsive"><table class="recent-table">
      <thead><tr><th>Cliente</th><th>Data</th><th>Resumo</th><th>Usuário</th>${isAdmin ? '<th>Ações</th>' : ''}</tr></thead><tbody>`;
      
    html += dados.map(d => `
      <tr>
        <td><strong>${d.clientes?.nome || 'N/A'}</strong></td>
        <td>${new Date(d.data).toLocaleString('pt-BR')}</td>
        <td>${d.anotacoes}</td>
        <td><small class="status-badge prazo-verde">${d.usuarios?.nome || 'Sistema'}</small></td>
        ${isAdmin ? `<td><button class="btn-sm btn-delete" data-id="${d.id}" style="color: #ef4444;"><i class="fa-solid fa-trash"></i></button></td>` : ''}
      </tr>`).join('');
      
    html += `</tbody></table></div></div>`;
    this.container.innerHTML = html;
  }
};

const controller = {
  async init() {
    view.init();
    await this.carregar();
    await this.carregarClientes();
  },

  async carregar() {
    const { data, error } = await supabase
      .from('atendimentos')
      .select('*, clientes(nome), usuarios(nome)')
      .order('data', { ascending: false });
      
    if(!error) view.renderizar(data);
  },

  async carregarClientes() {
    const { data } = await supabase.from('clientes').select('id, nome').order('nome');
    if(data) {
      view.selectCliente.innerHTML = '<option value="">Selecione...</option>' + 
        data.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
    }
  },

  async salvar(e) {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Busca ID do usuario na tabela usuarios baseado no email auth
    const { data: usuarioDB } = await supabase.from('usuarios').select('id').eq('email', user.email).single();
    
    const novo = {
      cliente_id: document.getElementById('atend-cliente').value,
      data: document.getElementById('atend-data').value,
      anotacoes: document.getElementById('atend-anotacoes').value,
      usuario_id: usuarioDB?.id
    };

    const { error } = await supabase.from('atendimentos').insert(novo);
    if (!error) {
      view.modal.style.display = 'none';
      view.form.reset();
      controller.carregar();
    } else { alert('Erro: ' + error.message); }
  },

  async handleClick(e) {
    const btn = e.target.closest('.btn-delete');
    if (btn && confirm('Deseja excluir este registro?')) {
      const { error } = await supabase
        .from('atendimentos')
        .delete()
        .eq('id', btn.dataset.id);
        
      if (!error) controller.carregar();
      else alert('Erro ao excluir: ' + error.message);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => controller.init());