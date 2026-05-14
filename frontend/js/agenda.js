
import { supabase } from './supabase.js';
import { AuthAPI } from './auth.js';
import { showToast } from './utils.js';

// ==========================================
// 1. MODEL
// ==========================================
const AgendaModel = {
  async listarTudo() {
    // Busca Atendimentos (agenda/reuniões)
    // (status badge será sempre REUNIÃO)

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');
    
    const { data: usuarioDB } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', user.email)
      .single();
    
    const { data, error } = await supabase
      .from('atendimentos')
      .select('*, clientes(nome)')
      .eq('usuario_id', usuarioDB.id)
      .order('data', { ascending: true });

    if (error) throw error;

    const lista = [];
    if (data) {
      data.forEach(r => {
        lista.push({
          id: r.id,
          tipo: 'REUNIAO',
          data: r.data,
          titulo: r.titulo || 'Reunião com Cliente',
          local: r.canal || 'Escritório / Online',
          processo: '-',
          cliente: r.clientes?.nome || 'Avulso',
          obs: r.anotacoes
        });
      });
    }

    return lista.sort((a, b) => new Date(a.data) - new Date(b.data));
  },

  async criar(dados) {
    const sanitizeUUID = (val) => (val && val.trim() !== '') ? val : null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // Busca ID do usuário na tabela pública
    const { data: uData } = await supabase.from('usuarios').select('id').eq('email', user.email).single();

    // Cria o atendimento (o agendamento da agenda)
    const payload = {
      titulo: dados.titulo || 'Reunião',
      data: dados.data,
      cliente_id: sanitizeUUID(dados.cliente_id),
      usuario_id: uData?.id || null,
      canal: dados.local || 'Escritório',
      anotacoes: (dados.obs || '')
    };

    const { data: created, error } = await supabase
      .from('atendimentos')
      .insert([payload])
      .select('id')
      .single();

    if (error) throw error;

    // Persiste vínculos de participantes (clientes + usuários)
    const clienteParticipantes = (dados.participantes?.clientes || []).map(c => ({
      atendimento_id: created.id,
      tipo: 'CLIENTE',
      cliente_id: sanitizeUUID(c.id)
    }));

    const usuarioParticipantes = (dados.participantes?.usuarios || []).map(u => ({
      atendimento_id: created.id,
      tipo: 'USUARIO',
      usuario_id: sanitizeUUID(u.id)
    }));

    const participantesPayload = [...clienteParticipantes, ...usuarioParticipantes]
      .filter(p => p.cliente_id || p.usuario_id);

    if (participantesPayload.length) {
      try {
        const { error: vErr } = await supabase
          .from('atendimento_participantes')
          .insert(participantesPayload)
          .select('id');
        if (vErr) throw vErr;
      } catch (e) {
        console.error('Falha ao inserir atendimento_participantes (RLS/migração):', e);
        showToast('Falha ao salvar participantes (RLS/migração).', 'error');
      }
    }

    return true;
  },

  async atualizar(id, dados) { 

    const sanitizeUUID = (val) => (val && val.trim() !== '') ? val : null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data: uData } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', user.email)
      .single();

    const payload = {
      titulo: dados.titulo || 'Reunião',
      data: dados.data,
      cliente_id: sanitizeUUID(dados.cliente_id),
      usuario_id: uData?.id || null,
      canal: dados.local || 'Escritório',
      anotacoes: (dados.obs || '')
    };

    const { error } = await supabase
      .from('atendimentos')
      .update(payload)
      .eq('id', id);

    if (error) throw error;

    // Atualiza participantes (remove e reinsere para garantir que edite ao invés de duplicar)
    const { error: delErr } = await supabase
      .from('atendimento_participantes')
      .delete()
      .eq('atendimento_id', id);

    if (delErr) {
      console.error('Falha ao limpar atendimento_participantes (RLS/migração):', delErr);
      showToast('Falha ao atualizar participantes (RLS/migração).', 'error');
    }

    const clienteParticipantes = (dados.participantes?.clientes || []).map(c => ({
      atendimento_id: id,
      tipo: 'CLIENTE',
      cliente_id: sanitizeUUID(c.id)
    }));

    const usuarioParticipantes = (dados.participantes?.usuarios || []).map(u => ({
      atendimento_id: id,
      tipo: 'USUARIO',
      usuario_id: sanitizeUUID(u.id)
    }));

    const participantesPayload = [...clienteParticipantes, ...usuarioParticipantes]
      .filter(p => p.cliente_id || p.usuario_id);

    if (participantesPayload.length) {
      try {
        const { error: vErr } = await supabase
          .from('atendimento_participantes')
          .insert(participantesPayload)
          .select('id');
        if (vErr) throw vErr;
      } catch (e) {
        console.error('Falha ao inserir atendimento_participantes (RLS/migração):', e);
        showToast('Falha ao salvar participantes (RLS/migração).', 'error');
      }
    }

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
  listClientesMulti: document.getElementById('agenda-clientes-result'),
  listUsuariosMulti: document.getElementById('agenda-usuarios-result'),
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

    // Estilos do UX: resultados e chips (sem checkboxes)
    const style = document.createElement('style');
    style.textContent = `
      .search-result-item{
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:10px;
        padding:6px 8px;
        border:1px solid #eee;
        border-radius:8px;
        margin:6px 0;
        background:#fff;
      }
      .search-result-name{font-weight:600; font-size:0.9rem; color: var(--azul-escuro)}
      .search-result-meta{font-size:0.76rem; color: var(--cinza-medio); margin-top:2px}
      .chip{
        display:inline-flex;
        align-items:center;
        gap:8px;
        padding:6px 10px;
        border:1px solid var(--cinza-borda);
        border-radius:999px;
        background:#fff;
        font-size:0.85rem;
      }
      .chip button{
        border:none;
        background:transparent;
        cursor:pointer;
        color: var(--cinza-medio);
        font-size:0.9rem;
        padding:0;
      }
      .chip button:hover{color: var(--azul-escuro)}
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
          <span class="status-badge icon-green">${evt.tipo === 'PERICIA' ? 'PERÍCIA' : (evt.tipo === 'AUDIENCIA' ? 'AUDIÊNCIA' : 'REUNIÃO')}</span>
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
    // Mantém apenas o select simples (cliente vinculado opcional)
    this.selectClienteSingle.innerHTML = '<option value="">(Opcional) Selecione...</option>' +
      clientes.map(c => `<option value="${c.id}">${c.nome}</option>`).join('');
  },

  popularSelectUsuarios(usuarios) {
    // Não renderiza lista de checkboxes no novo UX
    // (equipe interna é selecionada via busca + chips)
    void usuarios;
  },

  // Alterna a visibilidade dos campos do formulário
  toggleForm() {
    const modalBody = this.form.querySelector('.modal-body');
    
    // Garante que o campo de Título exista no modal
    if (modalBody && !document.getElementById('agenda-titulo')) {
      const tituloHtml = `
        <div class="form-group" id="group-titulo">
          <label for="agenda-titulo">Assunto / Título da Reunião *</label>
          <input type="text" id="agenda-titulo" placeholder="Ex: Reunião Inicial ou Fechamento de Contrato" required>
        </div>
      `;
      modalBody.insertAdjacentHTML('afterbegin', tituloHtml);
    }

    this.blocoVinculos.style.display = 'none';
    this.blocoParticipantes.style.display = 'block';
    
    if (this.selectTipo) {
      this.selectTipo.value = 'reuniao';
      this.selectTipo.parentElement.style.display = 'none'; // Esconde o seletor de tipo
    }

    // Ajusta o label do campo "extra" para algo mais intuitivo em reuniões
    const labelExtra = document.querySelector('label[for="agenda-extra"]');
    if (labelExtra) labelExtra.textContent = 'Link da Reunião (se online)';
    const inputExtra = document.getElementById('agenda-extra');
    if (inputExtra) inputExtra.placeholder = 'https://zoom.us/j/...';
  },

  abrirModal(dados = null, visualizacao = false) {
    this.form.reset(); // Limpa o formulário
    document.getElementById('modal-titulo').textContent = visualizacao ? 'Detalhes do Agendamento' : (dados ? 'Editar Agendamento' : 'Novo Agendamento'); // Define o título
    
    // Reseta estado dos inputs
    const inputs = this.form.querySelectorAll('input, select, textarea');
    inputs.forEach(el => el.disabled = visualizacao);

    // Aplica/remove a classe mode-view para estilização de leitura
    if (visualizacao) {
      this.form.classList.add('mode-view');
    } else {
      this.form.classList.remove('mode-view');
    }
    
    // Botão Salvar
    const btnSalvar = this.form.querySelector('button[type="submit"]');
    if (btnSalvar) btnSalvar.style.display = visualizacao ? 'none' : 'block';

    this.modal.style.display = 'flex';
    
    if (document.getElementById('agenda-titulo')) document.getElementById('agenda-titulo').value = dados?.titulo || '';

    // Reseta agendaId (criação por padrão)
    this.form.dataset.agendaId = '';

    if (dados) {
        // Lógica de preenchimento virá no controller
    } else {
        // Em criação: garantir que não fique nada pre-selecionado
        const clientesChipsEl = document.getElementById('agenda-clientes-selecionados');
        const usuariosChipsEl = document.getElementById('agenda-usuarios-selecionados');
        if (clientesChipsEl) clientesChipsEl.innerHTML = '';
        if (usuariosChipsEl) usuariosChipsEl.innerHTML = '';
        const hiddenClientes = document.getElementById('agenda-clientes-ids');
        const hiddenUsuarios = document.getElementById('agenda-usuarios-ids');
        if (hiddenClientes) hiddenClientes.value = '';
        if (hiddenUsuarios) hiddenUsuarios.value = '';
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
      AgendaView.toggleForm();
      AgendaView.abrirModal();
    };
    AgendaView.btnCancelar.onclick = () => AgendaView.modal.style.display = 'none';
    
    AgendaView.form.onsubmit = async (e) => {
      // agendaId fica setado somente quando abrir em modo edição

      e.preventDefault();
      try {
        const dataInput = document.getElementById('agenda-data').value;

        const horaInput = document.getElementById('agenda-hora').value;
        if (!dataInput || !horaInput) return showToast('Por favor, selecione a data e hora.', 'warning');

        // Combina data e hora no formato ISO
        const dataIso = new Date(`${dataInput}T${horaInput}`).toISOString();

        if (!document.getElementById('agenda-titulo').value) return showToast('O título da reunião é obrigatório.', 'warning');

        const dados = {
          tipo: 'reuniao',
          data: dataIso,
          titulo: document.getElementById('agenda-titulo').value,
          local: document.getElementById('agenda-local').value,
          extra: document.getElementById('agenda-extra').value,
          obs: document.getElementById('agenda-obs').value
        };

        // Coleta selecionados via checkbox dentro do chip (sem depender de checkboxes no HTML)
        const clientesSelecionados = Array.from(
          document.querySelectorAll('#agenda-clientes-selecionados input[type="checkbox"][data-id]:checked')
        ).map(cb => ({
          id: cb.dataset.id,
          nome: cb.dataset.nome
        }));

        const usuariosSelecionados = Array.from(
          document.querySelectorAll('#agenda-usuarios-selecionados input[type="checkbox"][data-id]:checked')
        ).map(cb => ({
          id: cb.dataset.id,
          nome: cb.dataset.nome
        }));

        dados.participantes = {
          clientes: clientesSelecionados,
          usuarios: usuariosSelecionados
        };


        dados.cliente_id = clientesSelecionados.length > 0 ? clientesSelecionados[0].id : null;


        const agendaId = AgendaView.form.dataset.agendaId;
        if (agendaId) {
          await AgendaModel.atualizar(agendaId, dados);
        } else {
          await AgendaModel.criar(dados);
        }
        AgendaView.modal.style.display = 'none';
        AgendaView.form.reset();
        this.carregar();
      } catch(err) { showToast(err.message, 'error'); }
    };

    await this.carregar();
    
    // Carrega processos para o select
    const { data: processos } = await supabase.from('processos').select('id, numero_cnj, clientes(nome)').order('criado_em', {ascending: false});
    if(processos) AgendaView.popularSelectProcessos(processos);
    
    // Carrega clientes e usuários para o select opcional (sem lista de checkboxes)
    const { data: clientes } = await supabase.from('clientes').select('id, nome').order('nome', {ascending: true});
    if(clientes) AgendaView.popularSelectClientes(clientes);

    const { data: usuarios } = await supabase.from('usuarios').select('id, nome, role').order('nome', {ascending: true});
    if(usuarios) AgendaView.popularSelectUsuarios(usuarios);

    // UX: busca + seleção via chips
    const clientesBusca = document.getElementById('agenda-clientes-busca');
    const clientesResult = document.getElementById('agenda-clientes-result');
    const clientesIdsHidden = document.getElementById('agenda-clientes-ids');
    const clientesChipsEl = document.getElementById('agenda-clientes-selecionados');

    const usuariosBusca = document.getElementById('agenda-usuarios-busca');
    const usuariosResult = document.getElementById('agenda-usuarios-result');
    const usuariosIdsHidden = document.getElementById('agenda-usuarios-ids');
    const usuariosChipsEl = document.getElementById('agenda-usuarios-selecionados');

    // Garante que existem para o fluxo não quebrar
    if (!clientesChipsEl || !usuariosChipsEl) {
      // Sem containers, segue sem UX de participantes.
      console.warn('Agenda UX: containers de chips não encontrados.');
    }


    const escapeHtml = (s) => (s ?? '').toString().replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'<','>':'>','"':'"',"'":'&#39;'}[c]));



    const syncHiddenIds = () => {
      // Agora o estado real vem dos checkboxes
      const clienteIds = Array.from(
        clientesChipsEl.querySelectorAll('input[type="checkbox"][data-id]:checked')
      ).map(cb => cb.dataset.id);

      const usuarioIds = Array.from(
        usuariosChipsEl.querySelectorAll('input[type="checkbox"][data-id]:checked')
      ).map(cb => cb.dataset.id);

      if (clientesIdsHidden) clientesIdsHidden.value = clienteIds.join(',');
      if (usuariosIdsHidden) usuariosIdsHidden.value = usuarioIds.join(',');
    };

    const chipHtml = ({ id, nome, role, checked, removeable }) => `
      <span class="chip" data-id="${id}" data-nome="${escapeHtml(nome)}">
        <label style="display:inline-flex; align-items:center; gap:8px; cursor:pointer;">
          <input
            type="checkbox"
            data-id="${id}"
            data-nome="${escapeHtml(nome)}"
            ${checked ? 'checked' : ''}
            ${AgendaView.form.classList.contains('mode-view') ? 'disabled' : ''}
            style="width:auto;"
          />
          <span>
            ${escapeHtml(nome)}${role ? ' (' + escapeHtml(role) + ')' : ''}
          </span>
        </label>
        ${!AgendaView.form.classList.contains('mode-view') && removeable ? '<button type="button" aria-label="Remover">×</button>' : ''}
      </span>
    `;


    const setSelectedFromArrays = (clientesArr, usuariosArr) => {
      if (!clientesChipsEl || !usuariosChipsEl) return;
      clientesChipsEl.innerHTML = '';
      usuariosChipsEl.innerHTML = '';

      const removeable = !AgendaView.form.classList.contains('mode-view');
      clientesArr.forEach(c => clientesChipsEl.insertAdjacentHTML(
        'beforeend',
        chipHtml({ id: c.id, nome: c.nome, checked: true, removeable })
      ));
      usuariosArr.forEach(u => usuariosChipsEl.insertAdjacentHTML(
        'beforeend',
        chipHtml({ id: u.id, nome: u.nome, role: u.role, checked: true, removeable })
      ));

      syncHiddenIds();
    };

    const renderResults = (items, container, onPick) => {
      if (!container) return;
      container.style.display = 'block';
      container.innerHTML = items.map(it => {
        const title = it.nome || it.name || it.cliente_nome || '';
        const meta = it.role ? `&nbsp;·&nbsp;<span class="text-muted">${escapeHtml(it.role)}</span>` : '';
        const primary = escapeHtml(title);
        return `
          <div class="search-result-item">
            <div>
              <div class="search-result-name">${primary}</div>
              ${it.role ? `<div class="search-result-meta">${escapeHtml(it.role)}</div>` : ''}
            </div>
            <button type="button" class="btn-sm btn-primary" data-id="${it.id}">Selecionar</button>
          </div>
        `;
      }).join('');

      container.querySelectorAll('button[data-id]').forEach(btn => {
        btn.onclick = () => {
          const id = btn.dataset.id;
          const picked = items.find(x => x.id === id);
          if (picked) onPick(picked);
        };
      });
    };

    const selectedIdSet = (chipsEl) => new Set(Array.from(chipsEl.querySelectorAll('.chip')).map(ch => ch.dataset.id));

    let clientesDebounceT = null;
    if (clientesBusca) {
      clientesBusca.addEventListener('input', async () => {
        const q = clientesBusca.value.trim();
        clearTimeout(clientesDebounceT);
        clientesDebounceT = setTimeout(async () => {
          const selected = selectedIdSet(clientesChipsEl);
          if (!q || q.length < 2) {
            if (clientesResult) clientesResult.style.display = 'none';
            return;
          }

          const { data, error } = await supabase
            .from('clientes')
            .select('id, nome')
            .ilike('nome', `%${q}%`)
            .order('nome', { ascending: true })
            .limit(8);

          if (error) return;
          const items = (data || []).filter(x => !selected.has(x.id));
          renderResults(items, clientesResult, (pick) => {
            clientesChipsEl.insertAdjacentHTML('beforeend', chipHtml({ id: pick.id, nome: pick.nome, checked: true, removeable: !AgendaView.form.classList.contains('mode-view') }));
            syncHiddenIds();
            if (clientesResult) clientesResult.style.display = 'none';
            clientesBusca.value = '';
          });
        }, 250);
      });
    }

    let usuariosDebounceT = null;
    if (usuariosBusca) {
      usuariosBusca.addEventListener('input', async () => {
        const q = usuariosBusca.value.trim();
        clearTimeout(usuariosDebounceT);
        usuariosDebounceT = setTimeout(async () => {
          const selected = selectedIdSet(usuariosChipsEl);
          if (!q || q.length < 2) {
            if (usuariosResult) usuariosResult.style.display = 'none';
            return;
          }

          const { data, error } = await supabase
            .from('usuarios')
            .select('id, nome, role')
            .ilike('nome', `%${q}%`)
            .order('nome', { ascending: true })
            .limit(8);

          if (error) return;
          const items = (data || []).filter(x => !selected.has(x.id));
          renderResults(items, usuariosResult, (pick) => {
            usuariosChipsEl.insertAdjacentHTML('beforeend', chipHtml({ id: pick.id, nome: pick.nome, role: pick.role, checked: true, removeable: !AgendaView.form.classList.contains('mode-view') }));
            syncHiddenIds();
            if (usuariosResult) usuariosResult.style.display = 'none';
            usuariosBusca.value = '';
          });
        }, 250);
      });
    }

    // UX: remover chip ao clicar em × (apenas se não estiver em modo visualização)
    if (clientesChipsEl) {
      clientesChipsEl.addEventListener('click', (ev) => {
        const btn = ev.target.closest('button');
        if (!btn) return;
        if (AgendaView.form.classList.contains('mode-view')) return;
        const chip = ev.target.closest('.chip');
        if (chip) chip.remove();
        syncHiddenIds();
      });
    }

    if (usuariosChipsEl) {
      usuariosChipsEl.addEventListener('click', (ev) => {
        const btn = ev.target.closest('button');
        if (!btn) return;
        if (AgendaView.form.classList.contains('mode-view')) return;
        const chip = ev.target.closest('.chip');
        if (chip) chip.remove();
        syncHiddenIds();
      });
    }

    // UX: atualizar hidden inputs ao marcar/desmarcar checkbox
    if (clientesChipsEl) {
      clientesChipsEl.addEventListener('change', (ev) => {
        if (ev.target && ev.target.matches('input[type="checkbox"][data-id]')) syncHiddenIds();
      });
    }

    if (usuariosChipsEl) {
      usuariosChipsEl.addEventListener('change', (ev) => {
        if (ev.target && ev.target.matches('input[type="checkbox"][data-id]')) syncHiddenIds();
      });
    }



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
            // Importante: trazer os campos que a UI exibe (local/link/obs/título) e IDs para popular participantes.
            const { data, error } = await supabase
              .from('atendimentos')
              .select('id, data, titulo, canal, cliente_id, usuario_id, anotacoes')
              .eq('id', id)
              .single();

            if (error) throw error;

            if (data) {
            AgendaView.abrirModal(data, visualizacao);

            // agendaId habilita o submit para atualizar em vez de duplicar
            AgendaView.form.dataset.agendaId = data.id;

            // Preenche o título e desabilita/habilita corretamente antes de renderizar participantes
            AgendaView.toggleForm();

            // Ajusta data (type="date") e mantém hora (type="time") ao editar
            const dateObj = new Date(data.data);
            const yyyy = String(dateObj.getFullYear());
            const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
            const dd = String(dateObj.getDate()).padStart(2, '0');
            document.getElementById('agenda-data').value = `${yyyy}-${mm}-${dd}`;

            const hh = String(dateObj.getHours()).padStart(2, '0');
            const min = String(dateObj.getMinutes()).padStart(2, '0');
            document.getElementById('agenda-hora').value = `${hh}:${min}`;
            
            if (document.getElementById('agenda-titulo')) document.getElementById('agenda-titulo').value = data.titulo || '';
            // Agenda armazena local em `canal`
            document.getElementById('agenda-local').value = data.canal || data.local || '';
            // Para agenda (reuniões), o campo extra na UI representa o complemento/link.
            // (atendimentos não possui coluna `perito` no schema atual)
            document.getElementById('agenda-extra').value = data.canal || data.local || '' ;
            document.getElementById('agenda-obs').value = data.anotacoes || ''; // Reuniões usam 'anotacoes'
            
            // Vínculos
            // (atendimentos na sua schema não possui processo_id; manter apenas cliente)
            if (data.cliente_id) document.getElementById('agenda-cliente-single').value = data.cliente_id;

            // Carrega participantes vinculados ao atendimento e marca somente os reais
            // (visualização e edição: ambas precisam refletir participantes reais)
            const { data: participantesVinc, error: pErr } = await supabase
              .from('atendimento_participantes')
              .select('tipo, cliente_id, usuario_id')
              .eq('atendimento_id', data.id);

            if (pErr) {
              // Se falhar por RLS/migração, não quebra o modal.
              console.error('Falha ao buscar atendimento_participantes:', pErr);
            }

            const vinc = participantesVinc || [];
            const clienteIds = new Set(vinc.filter(p => p.tipo === 'CLIENTE' && p.cliente_id).map(p => p.cliente_id));
            const usuarioIds = new Set(vinc.filter(p => p.tipo === 'USUARIO' && p.usuario_id).map(p => p.usuario_id));

            // Preenche chips com base nos IDs dos vínculos
            const clientesSelecionados = [];
            const usuariosSelecionados = [];

            if (clienteIds.size) {
              const { data: clientesSel } = await supabase
                .from('clientes')
                .select('id, nome')
                .in('id', Array.from(clienteIds));
              if (clientesSel) clientesSelecionados.push(...clientesSel);
            }

            if (usuarioIds.size) {
              const { data: usuariosSel } = await supabase
                .from('usuarios')
                .select('id, nome, role')
                .in('id', Array.from(usuarioIds));
              if (usuariosSel) usuariosSelecionados.push(...usuariosSel);
            }

            const clientesChipsEl = document.getElementById('agenda-clientes-selecionados');
            const usuariosChipsEl = document.getElementById('agenda-usuarios-selecionados');
            if (clientesChipsEl) clientesChipsEl.innerHTML = '';
            if (usuariosChipsEl) usuariosChipsEl.innerHTML = '';

            const chipTemplate = ({ id, nome, extra, checked, removeable }) => `
              <span class="chip" data-id="${id}" data-nome="${nome}">
                <label style="display:inline-flex; align-items:center; gap:8px; cursor:pointer;">
                  <input
                    type="checkbox"
                    data-id="${id}"
                    data-nome="${nome}"
                    ${checked ? 'checked' : ''}
                    ${visualizacao ? 'disabled' : ''}
                    style="width:auto;"
                  />
                  <span>
                    ${nome}${extra ? ' ' + extra : ''}
                  </span>
                </label>
                ${!visualizacao && removeable ? '<button type="button" aria-label="Remover">×</button>' : ''}
              </span>
            `;

            if (clientesChipsEl) {
              clientesSelecionados.forEach(c => {
                clientesChipsEl.insertAdjacentHTML(
                  'beforeend',
                  chipTemplate({ id: c.id, nome: c.nome, checked: true, removeable: !visualizacao })
                );
              });
            }

            if (usuariosChipsEl) {
              usuariosSelecionados.forEach(u => {
                usuariosChipsEl.insertAdjacentHTML(
                  'beforeend',
                  chipTemplate({
                    id: u.id,
                    nome: u.nome,
                    extra: `(${u.role})`,
                    checked: true,
                    removeable: !visualizacao
                  })
                );
              });
            }

            // Se estiver em modo visualização, desabilita remoção de chips
            if (visualizacao) {
              document.querySelectorAll('#agenda-clientes-selecionados .chip button, #agenda-usuarios-selecionados .chip button')
                .forEach(b => b && b.remove());
            }

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
