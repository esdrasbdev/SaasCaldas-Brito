/*
 * Módulo Agenda - Arquitetura MVC
 * Lista unificada de Audiências e Perícias em formato de tabela
 */

import { supabase } from './supabase.js';
import { AuthAPI } from './auth.js';
import { showToast } from './utils.js';

// ==========================================
// 1. MODEL
// ==========================================
const AgendaModel = {
  async listarTudo() {
    // Busca em paralelo
    const [resAudiencias, resPericias, resReunioes] = await Promise.all([
      supabase.from('audiencias').select('*, clientes(nome), processos(numero_cnj, clientes(nome))'),
      supabase.from('pericias').select('*, clientes(nome), processos(numero_cnj, clientes(nome))'),
      supabase.from('atendimentos').select('*, clientes(nome)').order('data', { ascending: true })
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
          cliente: a.clientes?.nome || a.processos?.clientes?.nome || '-',
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
          titulo: `Perícia ${p.tipo || ''}: ${p.perito || 'Técnica'}`,
          local: p.local,
          processo: p.processos?.numero_cnj || 'S/N',
          cliente: p.clientes?.nome || p.processos?.clientes?.nome || '-',
          obs: p.tipo === 'Judicial' ? `Tribunal: ${p.tribunal} - Vara: ${p.vara}` : p.local
        });
      });
    }

    // Normaliza Reuniões (Atendimentos Futuros)
    if (resReunioes.data) {
      resReunioes.data.forEach(r => {
        lista.push({
          id: r.id,
          tipo: 'REUNIAO',
          data: r.data,
          titulo: 'Reunião com Cliente',
          local: 'Escritório / Online',
          processo: '-',
          cliente: r.clientes?.nome || 'Avulso',
          obs: r.anotacoes
        });
      });
    }

    // Ordena por data (mais recente primeiro ou futuro primeiro)
    // Aqui ordenamos data crescente (próximos eventos)
    return lista.sort((a, b) => new Date(a.data) - new Date(b.data));
  },

  async criar(dados) {
    let tabela;
    let payload = {};

    // Converte string vazia para null (evita erro de UUID inválido no Supabase)
    const sanitizeUUID = (val) => (val && val.trim() !== '') ? val : null;

    if (dados.tipo === 'audiencia') {
      tabela = 'audiencias';
      payload = { data: dados.data, processo_id: sanitizeUUID(dados.processo_id), cliente_id: sanitizeUUID(dados.cliente_id), local: dados.local, observacoes: dados.obs };
      payload.tipo = 'Agendado via Agenda'; // Valor default ou campo extra
    } else if (dados.tipo === 'pericia') {
      tabela = 'pericias';
      payload = { data: dados.data, processo_id: sanitizeUUID(dados.processo_id), cliente_id: sanitizeUUID(dados.cliente_id), local: dados.local, perito: dados.extra };
    } else if (dados.tipo === 'reuniao') {
      tabela = 'atendimentos';
      // Para reuniões, precisamos do ID do usuário logado
      const { data: { user } } = await supabase.auth.getUser();
      // Busca ID público
      const { data: uData } = await supabase.from('usuarios').select('id').eq('email', user.email).single();
      
      // Constrói a anotação com os participantes para salvar no campo de texto
      const nomesClientes = dados.participantes.clientes.map(c => c.nome).join(', ');
      const nomesUsuarios = dados.participantes.usuarios.map(u => u.nome).join(', ');
      let participantesStr = [nomesClientes, nomesUsuarios].filter(Boolean).join(' e ');
      if (!participantesStr) participantesStr = 'N/A';

      payload = { 
        data: dados.data, 
        // Salva o ID do primeiro cliente selecionado para o vínculo principal
        cliente_id: sanitizeUUID(dados.cliente_id),
        usuario_id: uData?.id,
        anotacoes: `[Agendamento] Reunião com: ${participantesStr}. Local: ${dados.local}. Obs: ${dados.obs || ''}`
      };
    }

    const { error } = await supabase.from(tabela).insert([payload]);
    if (error) throw error;
    return true;
  },

  async deletar(id, tipo) {
    const tabela = tipo === 'AUDIENCIA' ? 'audiencias' : (tipo === 'PERICIA' ? 'pericias' : 'atendimentos');
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
  selectTipo: document.getElementById('agenda-tipo'),
  blocoVinculos: document.getElementById('bloco-vinculos'),
  blocoParticipantes: document.getElementById('bloco-participantes'),
  listClientesMulti: document.getElementById('agenda-clientes-list'),
  listUsuariosMulti: document.getElementById('agenda-usuarios-list'),
  selectClienteSingle: document.getElementById('agenda-cliente-single'),

  init() {
    this.container.innerHTML = `
      <div class="card-section">
        <div class="table-responsive">
          <table class="recent-table">
            <thead>
              <tr>
                <th>Data / Hora</th>
                <th>Evento / Detalhes</th>
                <th>Local / Participantes</th>
                <th>Status</th>
                <th style="text-align: right;">Ações</th>
              </tr>
            </thead>
            <tbody id="lista-agenda-body">
              <tr><td colspan="5" class="text-center">Carregando agenda...</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
    
    // Injeta estilos para a lista de checkboxes
    const style = document.createElement('style');
    style.textContent = `
      .checkbox-list-container {
        border: 1px solid var(--cinza-borda);
        border-radius: 8px;
        padding: 8px;
        height: 150px;
        overflow-y: auto;
        background: #f8fafc;
      }
      .checkbox-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 0;
        border-bottom: 1px solid #eee;
      }
      .checkbox-item:last-child { border-bottom: none; }
      .checkbox-item input { width: auto; margin: 0; }
      .checkbox-item label { margin: 0; font-weight: normal; font-size: 0.9rem; cursor: pointer; }
    `;
    document.head.appendChild(style);
  },

  renderizarTabela(eventos) {
    const tbody = document.getElementById('lista-agenda-body');
    const isAdmin = AuthAPI.getRole() === 'ADMIN';
    const isAdvogado = ['ADMIN', 'ADVOGADO'].includes(AuthAPI.getRole());

    if (!eventos || eventos.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding:40px;">Nenhum agendamento futuro encontrado.</td></tr>`;
      return;
    }

    tbody.innerHTML = eventos.map(evt => `
      <tr>
        <td style="width: 140px;">
          <strong>${new Date(evt.data).toLocaleDateString('pt-BR')}</strong><br>
          <span class="text-muted">${new Date(evt.data).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</span>
        </td>
        <td>
          <div style="font-weight:600; color: var(--azul-escuro)">${evt.titulo}</div>
          <small class="text-muted">${evt.processo !== 'S/N' && evt.processo !== '-' ? 'Proc: ' + evt.processo : (evt.cliente !== '-' ? 'Cliente: ' + evt.cliente : '')}</small>
        </td>
        <td>
          <div>${evt.local || '-'}</div>
          <small class="text-muted" title="${evt.obs || ''}" style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: inline-block;">${evt.obs || ''}</small>
        </td>
        <td>
          <span class="status-badge ${evt.tipo === 'AUDIENCIA' ? 'icon-blue' : (evt.tipo === 'REUNIAO' ? 'icon-green' : 'icon-purple')}">
            ${evt.tipo === 'REUNIAO' ? 'REUNIÃO' : evt.tipo}
          </span>
        </td>
        <td style="text-align: right;">
          <button class="btn-sm btn-view" data-id="${evt.id}" data-tipo="${evt.tipo}" title="Visualizar"><i class="fa-solid fa-eye"></i></button>
          ${isAdvogado ? `<button class="btn-sm btn-edit" data-id="${evt.id}" data-tipo="${evt.tipo}" title="Editar"><i class="fa-solid fa-pen"></i></button>` : ''}
          ${isAdmin ? `<button class="btn-sm btn-delete" data-id="${evt.id}" data-tipo="${evt.tipo}" style="color: #ef4444;" title="Excluir"><i class="fa-solid fa-trash"></i></button>` : ''}
        </td>
      </tr>
    `).join('');
  },

  popularSelectProcessos(processos) {
    this.selectProcessos.innerHTML = '<option value="">(Opcional) Selecione...</option>' + 
      processos.map(p => `<option value="${p.id}">CNJ: ${p.numero_cnj} - ${p.clientes?.nome}</option>`).join('');
  },

  popularSelectClientes(clientes) {
    // Popula a lista de checkboxes (Multi)
    this.listClientesMulti.innerHTML = clientes.map(c => `
      <div class="checkbox-item">
        <input type="checkbox" id="cli-${c.id}" value="${c.id}" data-nome="${c.nome}">
        <label for="cli-${c.id}">${c.nome}</label>
      </div>
    `).join('');

    // Popula o select simples
    this.selectClienteSingle.innerHTML = '<option value="">(Opcional) Selecione...</option>' + 
      clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
  },
  
  popularSelectUsuarios(usuarios) {
    this.listUsuariosMulti.innerHTML = usuarios.map(u => `
      <div class="checkbox-item">
        <input type="checkbox" id="user-${u.id}" value="${u.id}" data-nome="${u.nome.split(' ')[0]}">
        <label for="user-${u.id}">${u.nome} (${u.role})</label>
      </div>
    `).join('');
  },

  // Alterna a visibilidade dos campos do formulário
  toggleForm(tipo) {
    if (tipo === 'reuniao') {
      this.blocoVinculos.style.display = 'none';
      this.blocoParticipantes.style.display = 'block';
    } else { // audiência ou perícia
      this.blocoVinculos.style.display = 'grid';
      this.blocoParticipantes.style.display = 'none';
    }
  },

  abrirModal(dados = null, visualizacao = false) {
    this.form.reset();
    document.getElementById('modal-titulo').textContent = visualizacao ? 'Detalhes do Agendamento' : (dados ? 'Editar Agendamento' : 'Novo Agendamento');
    
    // Reseta estado dos inputs
    const inputs = this.form.querySelectorAll('input, select, textarea');
    inputs.forEach(el => el.disabled = visualizacao);
    
    // Botão Salvar
    const btnSalvar = this.form.querySelector('button[type="submit"]');
    if (btnSalvar) btnSalvar.style.display = visualizacao ? 'none' : 'block';

    this.modal.style.display = 'flex';
    
    // Se for visualização/edição, preencheria aqui (implementação simplificada abaixo)
    if (dados) {
        // Lógica de preenchimento virá no controller
    }
  }
};

// ==========================================
// 3. CONTROLLER
// ==========================================
const AgendaController = {
  async init() {
    AgendaView.init();
    
    AgendaView.btnNovo.onclick = () => {
      AgendaView.toggleForm(AgendaView.selectTipo.value); // Ajusta o form ao abrir
      AgendaView.abrirModal();
    };
    AgendaView.btnCancelar.onclick = () => AgendaView.modal.style.display = 'none';
    
    // Adiciona listener para alternar o formulário ao mudar o tipo de evento
    AgendaView.selectTipo.addEventListener('change', (e) => {
      AgendaView.toggleForm(e.target.value);
    });

    AgendaView.form.onsubmit = async (e) => {
      e.preventDefault();
      try {
        const tipo = document.getElementById('agenda-tipo').value;
        const dados = {
          tipo: tipo,
          data: document.getElementById('agenda-data').value,
          local: document.getElementById('agenda-local').value,
          extra: document.getElementById('agenda-extra').value,
          obs: document.getElementById('agenda-obs').value
        };

        if (tipo === 'reuniao') {
          // Coleta marcados na lista de clientes
          const clientesChecks = document.querySelectorAll('#agenda-clientes-list input[type="checkbox"]:checked');
          const clientesSelecionados = Array.from(clientesChecks);
          
          // Coleta marcados na lista de usuários
          const usuariosChecks = document.querySelectorAll('#agenda-usuarios-list input[type="checkbox"]:checked');
          const usuariosSelecionados = Array.from(usuariosChecks);

          dados.participantes = {
            clientes: clientesSelecionados.map(opt => ({ id: opt.value, nome: opt.dataset.nome })),
            usuarios: usuariosSelecionados.map(opt => ({ id: opt.value, nome: opt.dataset.nome }))
          };
          dados.cliente_id = clientesSelecionados.length > 0 ? clientesSelecionados[0].value : null;
        } else { // audiência ou perícia
          dados.cliente_id = document.getElementById('agenda-cliente-single').value || null;
          dados.processo_id = document.getElementById('agenda-processo').value;
          // Validação de processo removida conforme solicitado
        }

        await AgendaModel.criar(dados);
        AgendaView.modal.style.display = 'none';
        AgendaView.form.reset();
        this.carregar();
      } catch(err) { showToast(err.message, 'error'); }
    };

    await this.carregar();
    
    // Carrega processos para o select
    const { data: processos } = await supabase.from('processos').select('id, numero_cnj, clientes(nome)').order('criado_em', {ascending: false});
    if(processos) AgendaView.popularSelectProcessos(processos);
    
    // Carrega clientes para o select
    const { data: clientes } = await supabase.from('clientes').select('id, nome').order('nome', {ascending: true});
    if(clientes) AgendaView.popularSelectClientes(clientes);

    // Carrega usuários para o select
    const { data: usuarios } = await supabase.from('usuarios').select('id, nome, role').order('nome', {ascending: true});
    if(usuarios) AgendaView.popularSelectUsuarios(usuarios);

    // Delegação de eventos para ações (Visualizar, Editar, Excluir)
    AgendaView.container.addEventListener('click', async (e) => {
      const btn = e.target.closest('.btn-delete');
      const btnView = e.target.closest('.btn-view');
      const btnEdit = e.target.closest('.btn-edit');

      if (btn && confirm('Tem certeza que deseja excluir este agendamento?')) {
        try {
          await AgendaModel.deletar(btn.dataset.id, btn.dataset.tipo);
          this.carregar();
        } catch (err) { showToast('Erro ao excluir: ' + err.message, 'error'); }
      }

      if (btnView || btnEdit) {
        const btnAlvo = btnView || btnEdit;
        const id = btnAlvo.dataset.id;
        const tipo = btnAlvo.dataset.tipo;
        const visualizacao = !!btnView;

        // Busca dados completos para preencher o modal
        // Obs: Como o listarTudo já traz quase tudo normalizado, podemos buscar lá ou fazer query específica.
        // Para simplificar e garantir dados frescos, faremos uma query rápida baseada no tipo.
        let data;
        if (tipo === 'AUDIENCIA') {
            const { data: d } = await supabase.from('audiencias').select('*').eq('id', id).single();
            data = d;
        } else if (tipo === 'PERICIA') {
            const { data: d } = await supabase.from('pericias').select('*').eq('id', id).single();
            data = d;
        } else {
            const { data: d } = await supabase.from('atendimentos').select('*').eq('id', id).single();
            data = d;
        }

        if (data) {
            AgendaView.abrirModal(data, visualizacao);
            
            // Preenche campos comuns
            document.getElementById('agenda-tipo').value = tipo === 'AUDIENCIA' ? 'audiencia' : (tipo === 'PERICIA' ? 'pericia' : 'reuniao');
            AgendaView.toggleForm(document.getElementById('agenda-tipo').value);

            // Ajusta data para formato datetime-local
            const dateObj = new Date(data.data);
            const localDate = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
            document.getElementById('agenda-data').value = localDate;
            
            document.getElementById('agenda-local').value = data.local || ''; // Atendimentos podem não ter local na raiz, ajustar se necessário
            document.getElementById('agenda-extra').value = data.perito || ''; // Pericias
            document.getElementById('agenda-obs').value = data.observacoes || data.anotacoes || '';
            
            // Vínculos
            if (data.processo_id) document.getElementById('agenda-processo').value = data.processo_id;
            if (data.cliente_id) document.getElementById('agenda-cliente-single').value = data.cliente_id;
        }
      }
    });
  },

  async carregar() {
    const dados = await AgendaModel.listarTudo();
    AgendaView.renderizarTabela(dados);
  }
};

document.addEventListener('DOMContentLoaded', () => AgendaController.init());
