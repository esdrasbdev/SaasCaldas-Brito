/*
 * Lógica do Dashboard (Tela Inicial)
 * Carrega KPIs e informações gerais
 */

import { supabase } from './supabase.js';

async function carregarDashboard() {
  const hoje = new Date();
  const hora = hoje.getHours();
  
  // 1. Saudação dinâmica
  let saudacao = 'Bom dia';
  if (hora >= 12) saudacao = 'Boa tarde';
  if (hora >= 18) saudacao = 'Boa noite';
  const elSaudacao = document.getElementById('saudacao');
  if (elSaudacao) elSaudacao.textContent = `${saudacao}, Bem-vindo(a)`;

  // 2. Data formatada
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const dataFormatada = hoje.toLocaleDateString('pt-BR', options);
  
  const elData = document.getElementById('data-atual');
  if (elData) elData.textContent = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1);

  try {
    // Datas para filtros
    const inicioDia = new Date().toISOString().split('T')[0] + 'T00:00:00';
    const fimDia = new Date().toISOString().split('T')[0] + 'T23:59:59';
    
    // 3. Carregamento paralelo (Alta Performance)
    const [resProcessos, resClientes, resAudiencias, resRecentes] = await Promise.all([
      // KPI Processos Ativos
      supabase.from('processos').select('*', { count: 'exact', head: true }).eq('status', 'ATIVO'),
      
      // KPI Clientes
      supabase.from('clientes').select('*', { count: 'exact', head: true }),
      
      // KPI Audiencias Hoje
      supabase.from('audiencias').select('*', { count: 'exact', head: true }).gte('data', inicioDia).lte('data', fimDia),
      
      // Lista: Últimos 5 Processos
      supabase.from('processos')
        .select('id, numero_cnj, status, criado_em, clientes(nome)')
        .order('criado_em', { ascending: false })
        .limit(5)
    ]);

    // Atualiza KPIs
    document.getElementById('kpi-processos').textContent = resProcessos.count || 0;
    document.getElementById('kpi-clientes').textContent = resClientes.count || 0;
    document.getElementById('kpi-audiencias').textContent = resAudiencias.count || 0;

    // TODO: Implementar lógica de Prazos quando a tabela Publicações estiver populada
    document.getElementById('kpi-prazos').textContent = '0';

    // Atualiza Tabela de Recentes
    const tbody = document.getElementById('lista-recentes');
    if (resRecentes.data && resRecentes.data.length > 0) {
      tbody.innerHTML = resRecentes.data.map(p => `
        <tr>
          <td>
            <strong>${p.clientes?.nome || 'Sem cliente'}</strong>
            <span class="text-muted">${p.numero_cnj || 'S/N'}</span>
          </td>
          <td><span class="status-badge status-${p.status?.toLowerCase() || 'ativo'}">${p.status || 'ATIVO'}</span></td>
          <td>${new Date(p.criado_em).toLocaleDateString('pt-BR')}</td>
          <td><a href="processo-detalhe.html?id=${p.id}" class="btn-sm">Ver</a></td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = `
        <tr>
          <td colspan="4" class="text-center" style="padding: 20px; color: var(--cinza-medio);">
            <i class="fa-solid fa-folder-open" style="margin-bottom: 5px;"></i><br>
            Nenhum processo recente.
          </td>
        </tr>
      `;
    }
    
  } catch (error) {
    console.error('Erro carregando dashboard:', error);
  }
}

// Carrega apenas se estiver na página de dashboard
if (document.getElementById('kpi-processos')) {
  document.addEventListener('DOMContentLoaded', carregarDashboard);
}