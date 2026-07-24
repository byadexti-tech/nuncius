# Nuncius

MVP SaaS para criar widgets de chat incorporáveis e conectar cada widget a um
workflow do n8n.

## O que está incluído

- painel responsivo com criação, edição, exclusão e busca de projetos;
- site público separado do painel administrativo;
- login administrativo com sessão SSR em cookies via Supabase Auth;
- autorização por `app_metadata.role = "admin"` no painel e nas APIs de CRUD;
- snippet de incorporação gerado por projeto;
- widget isolado com Shadow DOM, sessão persistida no `localStorage` e layout
  responsivo;
- API intermediária que mantém o webhook privado e encaminha
  `projectId`, `sessionId` e `message`;
- persistência no Supabase com RLS habilitado;
- validação de entrada, CORS no chat e timeout de 30 segundos para o webhook.

## Configuração

1. Crie um projeto no Supabase.
2. Execute
   [`supabase/migrations/20260724000000_create_projects.sql`](./supabase/migrations/20260724000000_create_projects.sql)
   no SQL Editor ou use o Supabase CLI.
3. Copie `.env.example` para `.env.local` e informe:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua-publishable-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key
```

Use exclusivamente a **service role key** no servidor. Ela não possui o prefixo
`NEXT_PUBLIC_` e não deve ser exposta no navegador.

4. Instale e inicie:

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Ambientes local e online

A aplicação não mantém uma URL fixa no código:

- em desenvolvimento, usa `http://localhost:3000` (ou a porta definida em
  `PORT`);
- em deployments da Vercel, usa automaticamente
  `VERCEL_PROJECT_PRODUCTION_URL` ou `VERCEL_URL`;
- se a produção usa domínio próprio, configure `SITE_URL` apenas no ambiente
  **Production** da Vercel, por exemplo `https://app.seudominio.com`.

O snippet do widget usa a origem da página administrativa aberta. Assim, ao
copiá-lo localmente ele aponta para localhost; ao copiá-lo no deployment ele
aponta para o domínio online correspondente.

### Variáveis na Vercel

Cadastre estas três variáveis em **Production**, **Preview** e **Development**:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Os valores ficam em **Supabase > Project Settings > API**. A publishable key
pode ir ao navegador; a service role é secreta e deve existir somente nas
variáveis protegidas da Vercel e no `.env.local`.

### URLs no Supabase Auth

Em **Supabase > Authentication > URL Configuration**, use:

- **Site URL:** o domínio canônico de produção;
- **Redirect URLs:** `http://localhost:3000/**`, o domínio de produção com
  `/**` e, se usar deployments de Preview, o padrão dos seus domínios
  `vercel.app`.

O login atual é por e-mail e senha e não depende de callback externo, mas essas
URLs deixam confirmação por e-mail, recuperação de senha e provedores OAuth
preparados para funcionar nos dois ambientes.

## Site e administração

- `/` — site público;
- `/admin/login` — login administrativo;
- `/admin` — painel protegido;
- `/api/projects` — CRUD protegido por sessão e papel de administrador;
- `/api/chat` — endpoint público usado pelo widget.

Não existe cadastro público. Os administradores devem ser criados pelo servidor
ou pelo painel do Supabase Auth com o seguinte `app_metadata`:

```json
{ "role": "admin" }
```

## Contrato do webhook n8n

O Nuncius faz um `POST` com:

```json
{
  "projectId": "uuid-do-projeto",
  "sessionId": "uuid-da-sessao",
  "message": "Mensagem do visitante"
}
```

O workflow deve responder com JSON usando uma das propriedades abaixo:

```json
{ "reply": "Resposta para o visitante" }
```

Também são aceitas `response`, `message`, `output` ou `text`, além de uma
resposta em texto puro. No n8n, configure o Webhook para responder ao final do
workflow.

## Incorporação

O painel gera o snippet completo:

```html
<script
  src="https://seu-dominio.com/widget.js"
  data-project-id="uuid-do-projeto"
  defer
></script>
```

O script descobre a URL da API pela própria origem. Para apontar o widget a
outro backend, opcionalmente use `data-api-url`.

## Segurança antes de produção

O painel e o CRUD exigem autenticação e o papel `admin`, enquanto o banco
continua acessível somente pela service role no servidor. Antes de publicar,
adicione rate limiting ao endpoint `/api/chat`, proteção contra tentativas
repetidas de login e uma política de URLs permitidas para webhooks conforme a
sua infraestrutura.

## Comandos

```bash
npm run lint
npm run build
npm run start
```
