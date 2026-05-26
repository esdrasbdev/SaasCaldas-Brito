# TODO - Fix Supabase env + erros no frontend/backend

## Step 1 (Done - análise)
- Identificado que `frontend/js/env.js` está com placeholders vazios para `SUPABASE_URL` e `SUPABASE_ANON_KEY`.
- Isso causa `supabaseUrl is required` em `frontend/js/supabase.js`.

## Step 2 (Done)
- Atualizar `frontend/js/env.js` com as chaves reais do Supabase (URL e ANON key).


## Step 3
- Ajustar `frontend/js/supabase.js` para não lançar erro fatal se as variáveis estiverem vazias (melhorar mensagem/robustez).

## Step 4
- Tratar 404 do `favicon.ico` (opcional) para limpar console.

## Step 5
- Validar login/perícias carregando corretamente após as mudanças.

