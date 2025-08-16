# GodoySys (sysgerenc) – Deploy no Netlify + Neon

Este projeto foi ajustado para rodar **frontend (Vite/React)** no Netlify e a **API (Express/Drizzle/Neon)** dentro de **Netlify Functions**.

## ✅ O que eu mudei
- `vite.config.ts`: define `root: "client"` e corrige o alias `@` para `client/src`. O build sai em `dist/`.
- `netlify.toml`: adiciona build/publish, Functions, e redirects (`/api/*` → Function `api`).
- `netlify/functions/api.ts`: cria uma Function que envolve o Express via `serverless-http` e registra as rotas sem WebSocket.
- `server/routes.ts`: refatorado para expor `attachRoutes(app)` (rotas HTTP). `registerRoutes(app)` segue existindo para ambiente tradicional (com WebSocket).
- `server/services/email.ts`: corrige `nodemailer.createTransport` (bug comum).
- `package.json`: `build` agora só roda `vite build` (usado pelo Netlify). Script antigo foi preservado em `build:all`.
- `.env.example`: adiciona variáveis de ambiente necessárias (Neon, JWT, e-mail, etc).

> ⚠️ **WebSockets**: Netlify Functions não suportam WebSockets nativos. As rotas HTTP funcionam. Para tempo‑real, sugiro usar Pusher/Ably/Supabase Realtime, ou hospedar o servidor Node separado (Railway/Render) e manter o WS lá.

## 🚀 Deploy no Netlify
1. Faça fork/import deste repo no Netlify.
2. **Build command**: `npm run build`
3. **Publish directory**: `dist`
4. **Functions directory**: `netlify/functions` (já está em `netlify.toml`)
5. Defina as variáveis em **Site settings → Build & deploy → Environment**:
   - `DATABASE_URL` (Neon Postgres: habilite SSL `?sslmode=require`)
   - `JWT_SECRET`
   - `ADMIN_MASTER_PIN` (opcional)
   - `EMAIL_SERVICE`, `EMAIL_USER`, `EMAIL_PASS` (se for usar envio de e‑mail)

## 🧪 Rodar localmente
```bash
# Instalar deps
npm i

# Copiar env
cp .env.example .env  # e ajuste os valores

# Dev do client
npm run dev  # (se usar Express local, use scripts próprios)

# Build só do client (igual Netlify)
npm run build
npx serve dist
```

## 🔌 API no Netlify (rota)
No client, as chamadas já usam caminhos relativos como `/api/...`. O `netlify.toml` faz o redirect para a Function.

Se preferir um servidor **Node dedicado** (com WebSockets), use:
```bash
npm run build:all
node dist/index.js
```
e configure `VITE_API_BASE` apontando para a URL pública do servidor (ex.: `https://seu-servidor/api`).

## 📝 O que você pode ajustar
- **Banco (Neon)**: edite `DATABASE_URL` em **Netlify**.
- **E‑mail**: em `server/services/email.ts` você pode trocar `EMAIL_SERVICE` por SMTP customizado.
- **Rotas/Permissões**: em `server/middleware/auth.ts` e `server/routes.ts` (comentários incluídos) há notas do que alterar.

---

Se algo falhar no build do Netlify, cheque os **Logs de Deploy** e me avise o erro que eu arrumo na sequência.
