# BUGFIX — SaasCaldas-Brito: dados não chegam ao frontend

## Contexto

Sistema jurídico SaaS (Express + Supabase + Vanilla JS ES Modules) deployado na Vercel (frontend) e Railway (backend). Todos os módulos ficam presos em "Carregando..." porque três bugs críticos bloqueiam 100% do fluxo de dados. Nenhuma linha nova de feature deve ser adicionada — apenas as correções descritas abaixo.

---

## BUG 1 — Frontend sem credenciais do Supabase (crítico)

### Problema

`frontend/js/supabase.js` lê as credenciais de `window._env`, que é injetado por `frontend/js/env.js`. Esse arquivo está no `.gitignore` por segurança e **nunca é deployado**. Na Vercel, `window._env` é `undefined`, e o cliente Supabase é criado com URL `https://example.supabase.co` — todas as queries do frontend falham silenciosamente.

Módulos afetados que fazem queries diretas ao Supabase (sem passar pelo backend):
- `frontend/js/dashboard.js`
- `frontend/js/processos.js`
- `frontend/js/audiencias.js`
- `frontend/js/agenda.js`
- `frontend/js/clientes.js`
- `frontend/js/pericias.js`
- `frontend/js/atendimentos.js`

### Correção

**Passo 1 — Adicionar rota no backend** (`backend/index.js`)

Inserir antes das demais rotas de `/api/*`, logo após os middlewares de CORS e JSON:

```js
// Serve variáveis de ambiente públicas para o frontend
// Nunca exponha SUPABASE_SERVICE_ROLE_KEY aqui — apenas chaves públicas
app.get('/js/env.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(`window._env = {
  SUPABASE_URL: "${process.env.SUPABASE_URL || ''}",
  SUPABASE_ANON_KEY: "${process.env.SUPABASE_ANON_KEY || ''}"
};`);
});
```

**Passo 2 — Atualizar `vercel.json`**

Adicionar a reescrita para `/js/env.js` **antes** da regra catch-all `/(.*)`  — a ordem importa no Vercel:

```json
{
  "version": 2,
  "name": "juridico-caldas-brito",
  "rewrites": [
    {
      "source": "/js/env.js",
      "destination": "/backend/index.js"
    },
    {
      "source": "/api/(.*)",
      "destination": "/backend/index.js"
    },
    {
      "source": "/(.*)",
      "destination": "/frontend/$1"
    }
  ],
  "crons": [
    {
      "path": "/api/publicacoes/sincronizar",
      "schedule": "0 3 * * *"
    }
  ]
}
```

**Passo 3 — Verificar que todas as páginas HTML carregam `env.js`**

Conferir que todas as páginas abaixo têm `<script src="js/env.js"></script>` no `<head>`, **antes de qualquer `<script type="module">`**:

- `frontend/index.html` ✓ (já tem)
- `frontend/clientes.html` ✓ (já tem)
- `frontend/processos.html` ✓ (já tem)
- `frontend/audiencias.html` — verificar e adicionar se faltar
- `frontend/agenda.html` — verificar e adicionar se faltar
- `frontend/pericias.html` — verificar e adicionar se faltar
- `frontend/atendimentos.html` — verificar e adicionar se faltar
- `frontend/documentos.html` — verificar e adicionar se faltar
- `frontend/admin.html` — verificar e adicionar se faltar
- `frontend/publicacoes.html` — verificar e adicionar se faltar

O `<script src="js/env.js"></script>` deve sempre ser a **primeira tag script**, síncrona, sem `type="module"` e sem `defer`.

---

## BUG 2 — `authMiddleware` usa o objeto do módulo Supabase como se fosse um client (crítico)

### Problema

`backend/middleware/auth.js` faz:

```js
const supabase = require('../supabase');
```

Mas `backend/supabase.js` exporta `{ supabasePublic, supabaseAdmin, getAdminClient }` — um objeto comum, não um client Supabase. Portanto `supabase.auth` é `undefined`, e a linha `supabase.auth.getUser(token)` lança `TypeError: Cannot read properties of undefined`. Como esse middleware é aplicado a **todas as rotas protegidas**, nenhuma chamada de API funciona — todas retornam 401 ou 500.

### Correção

Substituir o conteúdo completo de `backend/middleware/auth.js`:

```js
/*
 * Middleware de Autenticação Global
 * Valida o JWT do Supabase e anexa o usuário da tabela 'usuarios' ao req.user
 */
const { supabasePublic } = require('../supabase');

const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token não fornecido' });

  const token = authHeader.split(' ')[1];

  try {
    // 1. Valida a sessão com o Supabase Auth
    const { data: { user }, error } = await supabasePublic.auth.getUser(token);
    if (error || !user) throw new Error('Sessão inválida');

    // 2. Busca os dados estendidos (role) na tabela de usuários
    const { data: dbUser, error: dbError } = await supabasePublic
      .from('usuarios')
      .select('id, email, role, nome')
      .eq('email', user.email)
      .single();

    if (dbError || !dbUser) throw new Error('Usuário não encontrado no cadastro');

    req.user = dbUser;
    next();
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
};

module.exports = authMiddleware;
```

---

## BUG 3 — Quatro rotas com o mesmo import errado (crítico)

### Problema

Os arquivos abaixo fazem `const supabase = require('../supabase')` e depois chamam `supabase.from(...)` ou `supabase.storage.from(...)`. Como `require('../supabase')` retorna o objeto do módulo (não um client), essas chamadas lançam `TypeError` e toda rota retorna 500.

### Correção por arquivo

---

#### `backend/routes/processos.js`

Substituir o conteúdo completo:

```js
/*
 * Rotas de Processos (Backend)
 */

const express = require('express');
const router = express.Router();
const { supabasePublic } = require('../supabase');

// GET /api/processos
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabasePublic
      .from('processos')
      .select('*, clientes(nome)')
      .order('criado_em', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

---

#### `backend/routes/atendimentos.js`

Substituir a linha de import e todas as ocorrências de `supabase.` por `supabasePublic.`:

```js
const express = require('express');
const router = express.Router();
const { supabasePublic } = require('../supabase');

// GET /api/atendimentos
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabasePublic
      .from('atendimentos')
      .select('*, clientes(nome), usuarios(nome)')
      .order('data', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/atendimentos
router.post('/', async (req, res) => {
  try {
    const novoAtendimento = {
      ...req.body,
      usuario_id: req.user.id
    };

    const { data, error } = await supabasePublic
      .from('atendimentos')
      .insert([novoAtendimento])
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

---

#### `backend/routes/publicacoes.js`

Substituir a linha de import:

```js
// DE:
const supabase = require('../supabase');

// PARA:
const { supabasePublic } = require('../supabase');
```

E substituir todas as ocorrências de `supabase.from(` por `supabasePublic.from(` no arquivo.

---

#### `backend/routes/documentos.js`

Substituir a linha de import:

```js
// DE:
const supabase = require('../supabase');

// PARA:
const { supabasePublic } = require('../supabase');
```

E substituir **todas** as ocorrências de `supabase.` por `supabasePublic.` no arquivo inteiro — isso inclui `supabase.from(`, `supabase.storage.from(`, e `supabase.storage.from('documentos').getPublicUrl(`.

---

## BUG 4 — `audiencias.js` e `pericias.js` criam client Supabase duplicado com SERVICE_ROLE (risco de segurança + inconsistência)

### Problema

`backend/routes/audiencias.js` e `backend/routes/pericias.js` criam um novo `createClient(...)` internamente usando `SUPABASE_SERVICE_ROLE_KEY`. Isso bypassa o padrão centralizado do projeto e usa a chave de service role onde não é necessário.

### Correção

**`backend/routes/audiencias.js`** — substituir o conteúdo completo:

```js
const express = require('express');
const router = express.Router();
const { supabasePublic } = require('../supabase');

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabasePublic
      .from('audiencias')
      .select('*, processos(numero_cnj), clientes(nome)');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { data, error } = await supabasePublic
      .from('audiencias')
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
```

**`backend/routes/pericias.js`** — substituir o conteúdo completo:

```js
const express = require('express');
const router = express.Router();
const { supabasePublic } = require('../supabase');

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabasePublic
      .from('pericias')
      .select('*, clientes(nome)');

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { data, error } = await supabasePublic
      .from('pericias')
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
```

---

## Checklist de validação após aplicar as correções

Após salvar todos os arquivos, verificar na ordem:

1. **Localmente:** iniciar o backend (`node backend/index.js`) e acessar `http://localhost:3001/js/env.js` no browser — deve retornar um JS com as variáveis preenchidas (não vazias).
2. **Localmente:** abrir o frontend e verificar no console do browser que `window._env.SUPABASE_URL` contém a URL real do Supabase.
3. **Deploy:** fazer push e verificar que o Vercel conclui o build sem erros.
4. **Pós-deploy:** acessar `https://<seu-dominio>.vercel.app/js/env.js` e confirmar que retorna as variáveis (sem a service role key).
5. **Smoke test:** fazer login, verificar que o dashboard carrega KPIs, abrir Clientes e confirmar que a lista aparece, abrir Processos e confirmar o mesmo.

---

## Arquivos modificados neste bugfix

| Arquivo | Tipo de mudança |
|---|---|
| `vercel.json` | Nova reescrita para `/js/env.js` |
| `backend/index.js` | Nova rota `GET /js/env.js` |
| `backend/middleware/auth.js` | Import corrigido: `supabasePublic` |
| `backend/routes/processos.js` | Import corrigido: `supabasePublic` |
| `backend/routes/atendimentos.js` | Import corrigido: `supabasePublic` |
| `backend/routes/publicacoes.js` | Import corrigido: `supabasePublic` |
| `backend/routes/documentos.js` | Import corrigido: `supabasePublic` |
| `backend/routes/audiencias.js` | Removido `createClient` duplicado, usa `supabasePublic` |
| `backend/routes/pericias.js` | Removido `createClient` duplicado, usa `supabasePublic` |
| Todas as páginas HTML | Verificar presença de `<script src="js/env.js">` no `<head>` |

Nenhuma alteração de schema SQL, seed, ou lógica de negócio é necessária.