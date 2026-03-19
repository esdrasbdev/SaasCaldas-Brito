/*
 * Módulo Agenda - Arquitetura MVC
 * Lista unificada de Audiências e Perícias em formato de tabela
 */

import { supabase } from './supabase.js';
import { AuthAPI } from './auth.js';

// ==========================================
// 1. MODEL
// ==========================================
const AgendaModel = {
  async listarTudo() {
    // Busca em paralelo
    const [resAudiencias, resPericias] = await Promise.all([
      supabase.from('audiencias').select('*, processos(numero_cnj, clientes(nome))'),
      supabase.from('pericias').select('*, processos(numero_cnj, clientes(nome))')
    ]);

    const lista = [];

    // Normaliza Audiências
    if (resAudiencias.data) {
      resAudiencias.data.forEach(a => {
        lista.push({
          id: a.id,
          tipo: 'AUDIENCIA',
          data: a.data,
          titulo: `Audiência: ${a.tipo || 'Geral'}`,
          local: a.local,
          processo: a.processos?.numero_cnj || 'S/N',
          cliente: a.processos?.clientes?.nome || '-',
          obs: a.observacoes
        });
      });
    }

    // Normaliza Perícias
    if (resPericias.data) {
      resPericias.data.forEach(p => {
        lista.push({
          id: p.id,
          tipo: 'PERICIA',
          data: p.data,
          titulo: `Perícia: ${p.perito || 'Técnica'}`,
          local: p.local,
          processo: p.processos?.numero_cnj || 'S/N',
          cliente: p.processos?.clientes?.nome || '-',
          obs: p.local // Perícias usam local/perito
        });
      });
    }

    // Ordena por data (mais recente primeiro ou futuro primeiro)
    // Aqui ordenamos data crescente (próximos eventos)
    return lista.sort((a, b) => new Date(a.data) - new Date(b.data));
  },

  async criar(dados) {
    // Decide onde salvar baseado no tipo
    const tabela = dados.tipo === 'audiencia' ? 'audiencias' : 'pericias';
    
    // Prepara objeto (remove o campo 'tipo' que é só do form)
    const payload = {
      data: dados.data,
      processo_id: dados.processo_id || null,
      local: dados.local,
    };

    if (tabela === 'audiencias') {
      payload.tipo = 'Agendado via Agenda'; // Valor default ou campo extra
      payload.observacoes = dados.obs;
    } else {
      // Pericias
      payload.perito = dados.extra; // Usamos o campo extra como Perito ou complemento
    }

    const { error } = await supabase.from(tabela).insert([payload]);
    if (error) throw error;
    return true;
  },

  async deletar(id, tipo) {
    // Tipo vem como 'AUDIENCIA' ou 'PERICIA'
    const tabela = tipo === 'AUDIENCIA' ? 'audiencias' : 'pericias';
    const { error } = await supabase
      .from(tabela)
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};

// ==========================================
// 2. VIEW
// ==========================================
const AgendaView = {
  container: document.getElementById('view-agenda-container'),
  modal: document.getElementById('modal-container'),
  form: document.getElementById('form-agenda'),
  btnNovo: document.getElementById('btn-novo-evento'),
  btnCancelar: document.getElementById('btn-cancelar'),
  selectProcessos: document.getElementById('agenda-processo'),

  init() {
    this.container.innerHTML = `
      <div class="card-section">
        <div class="table-responsive">
          <table class="recent-table">
            <thead>
              <tr>
                <th>Data / Hora</th>
                <th>Evento</th>
                <th>Processo / Cliente</th>
                <th>Local</th>
                <th>Status</th>
                ${AuthAPI.getRole() === 'ADMIN' ? '<th>Ações</th>' : ''}
              </tr>
            </thead>
            <tbody id="lista-agenda-body">
              <tr><td colspan="5" class="text-center">Carregando agenda...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderizarTabela(eventos) {
    const tbody = document.getElementById('lista-agenda-body');
    const isAdmin = AuthAPI.getRole() === 'ADMIN';

    if (!eventos || eventos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding:40px;">Nenhum agendamento futuro encontrado.</td></tr>`;
      return;
    }

    tbody.innerHTML = eventos.map(evt => `
      <tr>
        <td>
          <strong>${new Date(evt.data).toLocaleDateString('pt-BR')}</strong><br>
          <span class="text-muted">${new Date(evt.data).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
        </td>
        <td>
          <span style="font-weight:600; color: var(--azul-escuro)">${evt.titulo}</span>
        </td>
        <td>
          <div>${evt.processo}</div>
          <small class="text-muted">${evt.cliente}</small>
        </td>
        <td>${evt.local || '-'}</td>
        <td>
          <span class="status-badge ${evt.tipo === 'AUDIENCIA' ? 'icon-blue' : 'icon-purple'}">
            ${evt.tipo}
          </span>
        </td>
        ${isAdmin ? `<td><button class="btn-sm btn-delete" data-id="${evt.id}" data-tipo="${evt.tipo}" style="color: #ef4444;"><i class="fa-solid fa-trash"></i></button></td>` : ''}
      </tr>
    `).join('');
  },

  popularSelectProcessos(processos) {
    this.selectProcessos.innerHTML = '<option value="">(Opcional) Selecione...</option>' + 
      processos.map(p => `<option value="${p.id}">CNJ: ${p.numero_cnj} - ${p.clientes?.nome}</option>`).join('');
  }
};

// ==========================================
// 3. CONTROLLER
// ==========================================
const AgendaController = {
  async init() {
    AgendaView.init();
    
    AgendaView.btnNovo.onclick = () => AgendaView.modal.style.display = 'flex';
    AgendaView.btnCancelar.onclick = () => AgendaView.modal.style.display = 'none';
    
    AgendaView.form.onsubmit = async (e) => {
      e.preventDefault();
      try {
        await AgendaModel.criar({
          tipo: document.getElementById('agenda-tipo').value,
          data: document.getElementById('agenda-data').value,
          processo_id: document.getElementById('agenda-processo').value,
          local: document.getElementById('agenda-local').value,
          extra: document.getElementById('agenda-extra').value,
          obs: document.getElementById('agenda-obs').value
        });
        AgendaView.modal.style.display = 'none';
        AgendaView.form.reset();
        this.carregar();
      } catch(err) { alert('Erro: ' + err.message); }
    };

    await this.carregar();
    
    // Carrega processos para o select
    const { data } = await supabase.from('processos').select('id, numero_cnj, clientes(nome)').order('criado_em', {ascending: false});
    if(data) AgendaView.popularSelectProcessos(data);

    // Delegação de eventos para exclusão
    AgendaView.container.addEventListener('click', async (e) => {
      const btn = e.target.closest('.btn-delete');
      if (btn && confirm('Tem certeza que deseja excluir este agendamento?')) {
        try {
          await AgendaModel.deletar(btn.dataset.id, btn.dataset.tipo);
          this.carregar();
        } catch (err) { alert('Erro ao excluir: ' + err.message); }
      }
    });
  },

  async carregar() {
    const dados = await AgendaModel.listarTudo();
    AgendaView.renderizarTabela(dados);
  }
};

document.addEventListener('DOMContentLoaded', () => AgendaController.init());
