/*
 * Utilitários Compartilhados
 * Funções de UI reutilizáveis em todo o sistema
 */

// Exibe notificação flutuante (Toast)
// tipos: 'success' (verde), 'error' (vermelho), 'warning' (amarelo), 'info' (azul)
export function showToast(message, type = 'info') {
  // Cria container se não existir
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  // Define ícone baseado no tipo
  const icons = {
    success: 'fa-circle-check',
    error: 'fa-circle-exclamation',
    warning: 'fa-triangle-exclamation',
    info: 'fa-circle-info'
  };

  // Cria elemento do toast
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <i class="fa-solid ${icons[type] || icons.info}"></i>
    <span>${message}</span>
  `;

  // Adiciona ao DOM e anima
  container.appendChild(toast);
  
  // Remove automaticamente após 4 segundos
  setTimeout(() => {
    toast.style.animation = 'slideInRight 0.3s ease-in reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}