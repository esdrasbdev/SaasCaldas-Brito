/*
 * Middleware para exigir role específica
 * Uso: app.get('/admin', requireRole('ADMIN'), handler)
 */

function requireRole(roleRequerida) {
  return (req, res, next) => {
    if (!req.role) {
      return res.status(403).json({ error: 'Role não encontrada' });
    }

    // Hierarquia: ADMIN > ADVOGADO > ESTAGIARIO > ATENDENTE
    const roleOrder = {
      'ADMIN': 4,
      'ADVOGADO': 3,
      'ESTAGIARIO': 2,
      'ATENDENTE': 1
    };

    if (roleOrder[req.role] < roleOrder[roleRequerida]) {
      return res.status(403).json({ 
        error: `Role '${roleRequerida}' necessária` 
      });
    }

    next();
  };
}

module.exports = requireRole;

