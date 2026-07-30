# Nuncius

MVP SaaS para criar widgets de chat incorporáveis e conectar cada widget a um
workflow do n8n.

## O que está incluído

- painel responsivo com criação, edição, exclusão e busca de projetos;
- site público separado do painel administrativo;
- login administrativo com sessão SSR em cookies via Supabase Auth;
- autorização por organização, membership e papel (`owner`, `admin`, `editor`,
  `viewer` ou `billing`);
- snippet de incorporação gerado por projeto;
- widget isolado com Shadow DOM, sessão persistida no `localStorage` e layout
  responsivo;
- API intermediária que mantém o webhook privado e encaminha eventos do chat
  com `projectId`, `snippetId`, `sessionId`, `message`, `event` e `hidden`;
- saudação opcional gerada pelo n8n na primeira abertura do widget, sem exibir
  a mensagem técnica de ativação;
- persistência no Supabase com RLS habilitado;
- validação de entrada, CORS no chat e timeout de 3 minutos para o webhook.

## Configuração

1. Crie um projeto no Supabase.
2. Aplique, em ordem, todas as migrations de
   [`supabase/migrations`](./supabase/migrations) usando o Supabase CLI.
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
- `/api/projects` — CRUD protegido por sessão, organização e papel;
- `/api/chat` — endpoint público usado pelo widget.

Não existe cadastro público. As organizações e memberships são criadas pelo
servidor. A migration de acesso cria uma organização legada e vincula os
usuários existentes que possuíam o seguinte `app_metadata`:

```json
{ "role": "admin" }
```

Depois da migração, esse campo não é usado para autorizar projetos. O acesso é
determinado pelo membership do usuário em cada organização. Agências são
organizações próprias e recebem acesso delegado às organizações de seus
clientes por meio de vínculos explícitos.

## Contrato do webhook n8n

O Nuncius faz um `POST` com:

```json
{
  "projectId": "uuid-do-projeto",
  "snippetId": "uuid-do-snippet",
  "sessionId": "uuid-da-sessao",
  "message": "Mensagem do visitante",
  "event": "message",
  "hidden": false
}
```

Quando a opção **Saudação via webhook** está ativa no snippet, a primeira
abertura do chat envia o mesmo payload com `event: "chat_opened"`,
`hidden: true` e a mensagem de ativação configurada. Essa mensagem não aparece
no widget; somente a resposta do workflow é exibida como saudação.

No modo **Perguntas pré-definidas**, o widget exibe o texto de apresentação e
as opções cadastradas. Por padrão, o campo de texto também fica disponível
desde o início; essa exibição pode ser desativada na configuração do snippet.
A pergunta escolhida ou digitada é enviada ao mesmo webhook como uma mensagem
normal (`event: "message"` e `hidden: false`).

### Autenticação do visitante

Quando a autenticação está habilitada no snippet, o mesmo webhook recebe
primeiro o evento `authenticate`.

No modo **Login e senha**:

```json
{
  "event": "authenticate",
  "projectId": "uuid-do-projeto",
  "snippetId": "uuid-do-snippet",
  "sessionId": "uuid-da-sessao",
  "authentication": {
    "method": "manual",
    "username": "login-informado",
    "password": "senha-informada"
  }
}
```

No modo **Automático**, o site deve gerar no servidor um token opaco e
temporário e fornecê-lo ao widget pelo atributo `data-auth-token`:

```html
<script
  src="https://seu-dominio.com/widget.js"
  data-snippet-id="uuid-do-snippet"
  data-auth-token="TOKEN_TEMPORARIO_DO_USUARIO"
  defer
></script>
```

O n8n recebe esse valor em `authentication.token`. Também é possível entregar
ou renovar o token após o carregamento:

```js
window.dispatchEvent(
  new CustomEvent("nuncius:authenticate", {
    detail: {
      snippetId: "uuid-do-snippet",
      token: "TOKEN_TEMPORARIO_DO_USUARIO",
    },
  }),
);
```

Nos dois modos, o workflow confirma o acesso com:

```json
{
  "authenticated": true,
  "authToken": "token-opaco-de-sessao"
}
```

O `authToken` acompanha todas as mensagens seguintes em
`authentication.token`. O workflow deve validá-lo em cada requisição e
responder com HTTP `401` ou `403` quando estiver expirado ou inválido. Login,
senha e token não são persistidos pelo Nuncius.

O workflow deve responder com JSON usando uma das propriedades abaixo:

```json
{ "reply": "Resposta para o visitante" }
```

Também são aceitas `response`, `message`, `mensagem`, `output` ou `text`, além
de uma resposta em texto puro. No n8n, configure o Webhook para responder ao
final do workflow.

## Incorporação

O painel gera o snippet completo:

```html
<script
  src="https://seu-dominio.com/widget.js"
  data-snippet-id="uuid-do-snippet"
  defer
></script>
```

O script descobre a URL da API pela própria origem. Para apontar o widget a
outro backend, opcionalmente use `data-api-url`.

## Segurança antes de produção

O painel e o CRUD exigem autenticação e papéis de organização, enquanto o banco
continua acessível somente pela service role no servidor. O endpoint de login
do widget possui limite de tentativas, mas o workflow do n8n também deve
aplicar bloqueios progressivos e expiração curta dos tokens conforme a sua
infraestrutura.

## Comandos

```bash
npm run lint
npm run build
npm run start
```
