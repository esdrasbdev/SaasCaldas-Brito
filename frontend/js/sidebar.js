import { AuthAPI } from './auth.js';

const sidebar = document.getElementById('sidebar');

const menuItems = [
  { label: 'Dashboard', icon: 'fa-chart-pie', link: 'index.html', roles: ['ADMIN', 'ADVOGADO', 'ESTAGIARIO', 'ATENDENTE'] },
  { label: 'Clientes', icon: 'fa-users', link: 'clientes.html', roles: ['ADMIN', 'ADVOGADO', 'ESTAGIARIO', 'ATENDENTE'] },
  { label: 'Processos', icon: 'fa-scale-balanced', link: 'processos.html', roles: ['ADMIN', 'ADVOGADO', 'ESTAGIARIO'] },
  { label: 'Agenda', icon: 'fa-calendar-days', link: 'agenda.html', roles: ['ADMIN', 'ADVOGADO', 'ATENDENTE'] },
  { label: 'Audiências', icon: 'fa-gavel', link: 'audiencias.html', roles: ['ADMIN', 'ADVOGADO'] },
  { label: 'Perícias', icon: 'fa-magnifying-glass-location', link: 'pericias.html', roles: ['ADMIN', 'ADVOGADO'] },
  { label: 'Atendimentos', icon: 'fa-headset', link: 'atendimentos.html', roles: ['ADMIN', 'ADVOGADO', 'ESTAGIARIO', 'ATENDENTE'] },
  { label: 'Documentos', icon: 'fa-folder-open', link: 'documentos.html', roles: ['ADMIN', 'ADVOGADO'] },
  { label: 'Publicações', icon: 'fa-newspaper', link: 'publicacoes.html', roles: ['ADMIN'] },
  { label: 'Admin', icon: 'fa-lock', link: 'admin.html', roles: ['ADMIN'] },
];

function renderSidebar() {
  const userRole = AuthAPI.getRole();
  const userName = localStorage.getItem('userName') || 'Usuário';
  
  // Verifica preferência de tema salva
  const currentTheme = localStorage.getItem('theme') || 'light';
  if (currentTheme === 'dark') document.body.classList.add('dark-mode');

  // Define a inicial para o avatar
  const userInitial = userName.charAt(0).toUpperCase();

  // Identifica página atual para marcar como ativa
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  // 1. Cabeçalho (Logo)
  let html = `
    <div class="sidebar-header">
      <i class="fa-solid fa-scale-balanced"></i>
      <h2>Caldas & Brito</h2>
    </div>
    <div class="sidebar-nav">
  `;

  // 2. Links de Navegação (Filtrados por Role)
  menuItems.forEach(item => {
    if (userRole && item.roles.includes(userRole)) {
      const isActive = currentPage === item.link ? 'active' : '';
      html += `
        <a href="${item.link}" class="nav-item ${isActive}">
          <i class="fa-solid ${item.icon}"></i>
          <span>${item.label}</span>
        </a>
      `;
    }
  });

  html += `</div>`; // Fecha sidebar-nav

  // 3. Rodapé com Perfil do Usuário e Logout
  html += `
    <div class="sidebar-footer">
      <div class="user-profile">
        <div class="user-avatar">${userInitial}</div>
        <div class="user-info">
          <span class="user-name" title="${userName}">${userName}</span>
          <span class="user-role">${userRole || 'Carregando...'}</span>
        </div>
        <div style="display: flex; gap: 4px;">
          <button id="btn-theme-toggle" class="btn-logout" title="Alternar Tema">
            <i class="fa-solid ${currentTheme === 'dark' ? 'fa-sun' : 'fa-moon'}"></i>
          </button>
          <button id="btn-logout-sidebar" class="btn-logout" title="Sair do Sistema">
            <i class="fa-solid fa-right-from-bracket"></i>
          </button>
        </div>
      </div>
    </div>
  `;

  sidebar.innerHTML = html;

  // 4. Bind do Evento de Logout (Robusto)
  const themeBtn = document.getElementById('btn-theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');
      const isDark = document.body.classList.contains('dark-mode');
      
      // Atualiza ícone
      const icon = themeBtn.querySelector('i');
      icon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
      
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
  }

  const logoutBtn = document.getElementById('btn-logout-sidebar');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation(); // Previne qualquer comportamento estranho
      
      // Feedback visual
      logoutBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
      
      try {
        await AuthAPI.logout();
        // O redirecionamento é tratado dentro do AuthAPI.logout, 
        // mas por segurança garantimos aqui também:
        window.location.href = 'login.html';
      } catch (error) {
        console.error("Erro ao sair:", error);
        window.location.href = 'login.html';
      }
    });
  }
}

// Renderiza quando o DOM carrega
document.addEventListener('DOMContentLoaded', renderSidebar);

// Re-renderiza se a role mudar (ex: após login lento)
window.addEventListener('auth:role-ready', renderSidebar);