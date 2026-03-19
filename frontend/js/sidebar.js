/* 
 * Sidebar dinâmica baseada na role do usuário
 * Monta menu conforme permissões: ADMIN vê tudo, ATENDENTE vê básico
 * Separadores visuais entre grupos (Clientes/Processos/Agenda/etc)
 */

import { AuthAPI } from './auth.js';

// Template HTML para cada item do menu
function createNavItem(icon, label, href, roleRequired = null) {
  if (roleRequired && !AuthAPI.hasPermission(roleRequired)) {
    return ''; // Não renderiza se sem permissão
  }
  
  return `
    <a href="${href}" class="nav-item" data-page="${href.split('/').pop()}">
      <i class="${icon}"></i>
      <span>${label}</span>
    </a>
  `;
}

// Monta sidebar completa baseada na role atual
function renderSidebar() {
  const role = AuthAPI.getRole();
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  
  // Fallback: Se não tiver role (erro 500), mostra menu básico ou mensagem
  const userRole = role || 'CONVIDADO';

  let navHtml = `
    <div class="sidebar-header">
      <h2>Sistema Jurídico</h2>
      <div class="sidebar-perfil">
        <i class="fa-solid fa-user"></i>
        <span>${userRole.toUpperCase()}</span>
      </div>
    </div>
    
    <nav class="sidebar-nav">
      <ul>
        ${createNavItem('fa-solid fa-chart-line', 'Dashboard', 'index.html', null)}
        
        <div class="nav-separator"></div>
        
        ${createNavItem('fa-solid fa-users', 'Clientes', 'clientes.html', null)}
        ${createNavItem('fa-solid fa-scale-balanced', 'Processos', 'processos.html', null)}
        
        <div class="nav-separator"></div>
        
        ${createNavItem('fa-solid fa-calendar-days', 'Agenda', 'agenda.html')}
        ${createNavItem('fa-solid fa-gavel', 'Audiências', 'audiencias.html', 'ADVOGADO')}
        ${createNavItem('fa-solid fa-clipboard-list', 'Perícias', 'pericias.html', 'ADVOGADO')}
        ${createNavItem('fa-solid fa-handshake', 'Atendimentos', 'atendimentos.html')}
        
        <div class="nav-separator"></div>
        
        ${createNavItem('fa-solid fa-file-contract', 'Documentos', 'documentos.html')}
        ${createNavItem('fa-solid fa-newspaper', 'Publicações', 'publicacoes.html', 'ADMIN')}
        
        ${role === 'ADMIN' ? '<div class="nav-separator"></div>' : ''}
        ${createNavItem('fa-solid fa-users-gear', 'Configurações', 'admin.html', 'ADMIN')}
      </ul>
    </nav>
    
    <div class="sidebar-footer">
      <a href="#" class="btn-logout" onclick="AuthAPI.logout().then(() => location.href='login.html')">
        <i class="fa-solid fa-sign-out-alt"></i>
        Sair
      </a>
      <div class="sidebar-version">v1.0.0</div>
    </div>
  `;
  
  sidebar.innerHTML = navHtml;
  
  // Highlight página ativa
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const activeLink = sidebar.querySelector(`[data-page="${currentPage}"]`);
  if (activeLink) {
    activeLink.classList.add('active');
  }
}

// Inicializa sidebar quando auth carrega
document.addEventListener('DOMContentLoaded', () => {
  // Tenta renderizar imediatamente com o que tem no cache (Performance)
  renderSidebar();
  
  // Escuta evento de atualização da role (Reatividade)
  window.addEventListener('auth:role-ready', () => {
    renderSidebar();
  });
});

// Re-renderiza em mudança de auth
window.AuthAPI = window.AuthAPI || {};
const originalInit = window.AuthAPI.init;
window.AuthAPI.init = async (...args) => {
  await originalInit?.(...args);
  renderSidebar();
};
