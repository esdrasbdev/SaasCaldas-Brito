 # TODO.md (SaasCaldas-Brito)

- [x] Identificar causa raiz: `clientes.html` falha ao carregar `js/env.js` (404 em localhost) e Supabase cai no fallback `example.supabase.co`.
- [ ] Testar localmente: subir backend e abrir `http://localhost:<frontend_port>/clientes.html` verificando que `GET /js/env.js` funciona e `window._env` tem `SUPABASE_URL`/`SUPABASE_ANON_KEY`.
- [ ] Testar no deploy: validar `https://<dominio>/js/env.js` retorna `window._env` corretamente.
- [ ] Se faltar rewrite/serving no Vercel, ajustar `vercel.json` para garantir que `/js/env.js` é servido pelo backend.

