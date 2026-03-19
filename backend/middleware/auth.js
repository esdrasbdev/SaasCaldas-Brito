/* 
 * Middleware de autenticação Supabase para APIs backend
 * Valida JWT do header Authorization: Bearer <token>
 * Busca role do usuário na tabela usuarios
 */

const supabase = require('../supabase.js');

function createAuthMiddleware() {
  return async (req, res, next) => {
    try {
      // Extrai token do header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token não fornecido' });
      }

      const token = authHeader.substring(7);

      // Verifica sessão com token
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return res.status(401).json({ error: 'Token inválido' });
      }

      // Busca role na tabela usuarios
      const { data: usuario, error: roleError } = await supabase
        .from('usuarios')
        .select('role')
        .eq('email', user.email)
        .single();

      if (roleError || !usuario) {
        return res.status(403).json({ error: 'Usuário não encontrado' });
      }

      // Anexa user/role ao req
      req.user = user;
      req.role = usuario.role;

      next();
    } catch (error) {
      console.error('Erro middleware auth:', error);
      res.status(500).json({ error: 'Erro interno de autenticação' });
    }
  };
}

module.exports = createAuthMiddleware();
