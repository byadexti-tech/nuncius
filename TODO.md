# TODO e roadmap do Nuncius

Este documento organiza o trabalho futuro do produto. A prioridade arquitetural
é manter o Nuncius como **plano de controle** — cadastro, configuração,
publicação e cobrança — sem transformar a plataforma no caminho obrigatório das
mensagens trocadas entre os visitantes e o n8n de cada cliente.

## Princípios e decisões-base

- [ ] Tratar cada instalação como um tenant isolado, com proprietário, plano,
  limites, origens autorizadas e métricas próprias.
- [ ] Separar claramente:
  - **plano de controle Nuncius:** painel, autenticação, configurações, assets,
    billing e telemetria agregada;
  - **plano de dados do cliente:** mensagens, histórico e execução do n8n.
- [ ] Adotar por padrão o fluxo
  `widget → endpoint protegido do cliente → n8n do cliente`.
- [ ] Não prometer que uma URL colocada no JavaScript do navegador é secreta.
  Se o webhook n8n não puder ser público e protegido, exigir um front door do
  cliente (por exemplo, Worker, API gateway ou reverse proxy).
- [ ] Manter um relay Nuncius apenas como opção explícita, limitada, observável,
  tarifada e com desligamento automático em caso de abuso.
- [ ] Definir SLOs separados para o painel/configuração e para qualquer relay
  opcional; uma falha no n8n de um cliente não pode degradar outros tenants.

---

## MVP — antes de escalar o tráfego público

### P0 — retirar o Nuncius do caminho padrão das mensagens

- [ ] Definir e documentar o contrato do endpoint público do cliente:
  payload, resposta, timeout, códigos de erro, CORS, idempotência e limites.
- [ ] Incluir na configuração pública do widget somente o endpoint de chat
  publicado pelo cliente, nunca credenciais administrativas ou a service role.
- [ ] Alterar o fluxo padrão para o navegador enviar mensagens diretamente ao
  endpoint protegido do cliente.
- [ ] Fornecer um template de front door para o cliente, com:
  - allowlist de origens;
  - limite por IP, sessão e widget;
  - tamanho máximo de request e response;
  - timeout e limite de concorrência;
  - segredo entre o front door e o n8n;
  - logs sem conteúdo sensível;
  - bloqueio de métodos e content types inesperados.
- [ ] Explicar na documentação que CORS e `Origin` reduzem abuso em browsers,
  mas não autenticam chamadas servidor-servidor.
- [ ] Usar um identificador público rotacionável por instalação para
  atribuição e revogação. Não tratá-lo como segredo inviolável.
- [x] Remover o roteamento legado por `projectId`;
  aceitar somente instalações ativas e identificadas por `snippetId`.
- [ ] Persistir por sessão o evento de auto-start para não chamar o workflow
  novamente a cada reload ou navegação.

### P0 — conter o relay existente durante a migração

- [ ] Adicionar rate limit por IP, snippet e tenant.
- [ ] Definir quota diária e mensal de mensagens por plano.
- [ ] Aplicar limite de concorrência por tenant e circuit breaker por webhook.
- [ ] Rejeitar requests excessivos antes de fazer parse completo do body.
- [ ] Limitar o tamanho lido da resposta do webhook.
- [ ] Exigir HTTPS em produção.
- [ ] Proteger contra SSRF:
  - bloquear loopback, link-local e redes privadas;
  - resolver e validar DNS em cada conexão relevante;
  - impedir redirecionamento para destino proibido;
  - permitir, preferencialmente, hosts previamente verificados.
- [ ] Cadastrar origens autorizadas por snippet e responder CORS de forma
  específica, sem `Access-Control-Allow-Origin: *` no chat.
- [ ] Reduzir o timeout do relay e tornar o valor configurável por plano dentro
  de um teto seguro.
- [ ] Não registrar mensagens, respostas completas, tokens ou payloads de erro
  do n8n nos logs da plataforma.
- [ ] Criar kill switch global e por tenant para interromper abuso sem novo
  deploy.

### P0 — eliminar hot paths e egress desnecessário

- [ ] Criar consultas específicas para cada caso de uso:
  - config pública: apenas campos públicos;
  - roteamento: somente tenant, endpoint e flags necessárias;
  - painel: campos administrativos.
- [ ] Nunca carregar `launcher_image` nem configurações visuais no caminho de
  uma mensagem.
- [ ] Mover imagens do launcher para storage de objetos.
- [ ] Salvar no banco apenas URL, hash, dimensões e metadados do asset.
- [ ] Publicar assets com nome content-hashed e
  `Cache-Control: public, max-age=31536000, immutable`.
- [ ] Versionar o script do widget (`widget.v1.<hash>.js`) e manter uma política
  explícita de compatibilidade e depreciação.
- [ ] Cachear a configuração pública no CDN com `s-maxage` e
  `stale-while-revalidate`.
- [ ] Invalidar a configuração quando o administrador publicar uma alteração.
- [ ] Definir TTL curto no browser para config mutável e cache longo no CDN.
- [ ] Medir separadamente cache hit, cache miss, bytes do script, bytes da
  config e bytes dos assets.

### P0 — modelo mínimo de contas e relacionamentos

- [ ] Criar as entidades conceituais:
  - **conta/organização:** responsável comercial e financeiro;
  - **usuário:** pessoa autenticada;
  - **membership:** papel do usuário dentro da organização;
  - **projeto/cliente final:** dono da instalação e do endpoint;
  - **agência:** organização que administra clientes finais;
  - **afiliado:** origem comercial, sem acesso operacional por padrão.
- [ ] Definir papéis mínimos:
  - owner;
  - admin;
  - operator/editor;
  - viewer;
  - billing.
- [ ] Garantir que autorização use membership/ownership no banco, e não apenas
  um papel global no JWT.
- [ ] Permitir que uma agência gerencie vários clientes sem misturar dados,
  limites, domínios, webhooks ou faturas.
- [ ] Definir quem é o merchant of record em cada modelo:
  - Nuncius cobra diretamente o cliente final;
  - Nuncius cobra a agência;
  - agência revende e cobra o cliente fora do Nuncius.
- [ ] Registrar toda mudança de vínculo entre agência e cliente em audit log.

### P1 — billing, planos e proteção de margem

- [ ] Definir planos por valor do control plane, por exemplo:
  instalações ativas, membros, projetos, domínios e recursos do painel.
- [ ] Não incluir tráfego ilimitado do relay no preço-base.
- [ ] Para relay opcional, definir franquia e excedente por mensagem/request,
  com preço que cubra compute, memória, egress, observabilidade, suporte,
  inadimplência e margem de segurança.
- [ ] Criar hard limit, soft limit, alertas de 50/80/100% e período de graça
  explícito.
- [ ] Definir comportamento ao exceder quota: bloquear relay, degradar recurso
  opcional ou solicitar upgrade; nunca gerar custo ilimitado silenciosamente.
- [ ] Adotar orçamento mensal por tenant e orçamento global da plataforma.
- [ ] Configurar alertas e spend caps nos provedores quando disponíveis.
- [ ] Criar uma planilha/modelo de unit economics com:
  - custo por mil loads;
  - custo por mil configs sem cache;
  - custo por mil mensagens no relay;
  - custo de storage e egress de assets;
  - custo de banco, logs e suporte;
  - margem bruta por plano e por canal.

### P1 — Stripe no MVP comercial

- [ ] Modelar no banco os IDs externos da Stripe sem usá-los como chave
  primária de domínio.
- [ ] Criar Customer por conta pagadora, não automaticamente por usuário.
- [ ] Usar Checkout para contratação e Customer Portal para gestão inicial.
- [ ] Sincronizar assinatura por webhooks idempotentes e verificados.
- [ ] Tratar, no mínimo:
  `checkout.session.completed`, `customer.subscription.created`,
  `customer.subscription.updated`, `customer.subscription.deleted`,
  `invoice.paid` e `invoice.payment_failed`.
- [ ] Guardar `event_id` processado para impedir aplicação duplicada.
- [ ] Definir estado local de entitlement separado do estado visual do
  checkout.
- [ ] Definir regras de trial, upgrade, downgrade, proration, cancelamento,
  inadimplência e reativação.
- [ ] Não liberar plano com base apenas no redirect de sucesso do navegador.
- [ ] Conciliar periodicamente Stripe × banco local e alertar divergências.

### P1 — atribuição de afiliados

- [ ] Definir janela de atribuição, por exemplo 30 dias, e regra
  first-touch ou last-touch antes do lançamento.
- [ ] Registrar referral code, landing page, timestamp e evidência de
  atribuição; não depender somente de cookie.
- [ ] Impedir autoindicação, múltiplas contas artificiais e troca oportunista
  de afiliado após a conversão.
- [ ] Congelar a atribuição quando a assinatura nasce, com trilha de auditoria
  para ajustes manuais.
- [ ] Definir comissão sobre receita líquida efetivamente recebida, excluindo
  impostos, descontos, créditos, refunds, chargebacks e taxas quando aplicável.
- [ ] Definir duração da comissão recorrente: número de meses, enquanto a
  assinatura estiver ativa ou lifetime; documentar a regra comercial.
- [ ] Aplicar período de retenção antes de tornar a comissão pagável.
- [ ] Reverter comissão em refund, chargeback, fraude ou inadimplência.
- [ ] Definir valor mínimo de payout e calendário de fechamento.

### P1 — observabilidade mínima

- [ ] Adotar correlation ID por request e tenant ID em toda telemetria, sem
  incluir conteúdo das conversas.
- [ ] Criar métricas:
  - loads e configs por snippet;
  - cache hit/miss;
  - mensagens diretas e via relay;
  - latência p50/p95/p99 do endpoint do cliente;
  - timeouts, 4xx, 429 e 5xx;
  - concorrência e circuit breakers abertos;
  - bytes de entrada/saída;
  - custo estimado por tenant.
- [ ] Criar alertas de abuso, crescimento anormal, timeout e erro por tenant.
- [ ] Definir retenção e redaction de logs conforme LGPD.
- [ ] Criar dashboard operacional e runbooks para 429, webhook lento,
  provedor indisponível e aumento de custo.

---

## Próxima fase — produto multi-tenant e canais comerciais

### Contas, agências e clientes

- [ ] Permitir convite e remoção de membros com escopo por organização.
- [ ] Permitir à agência alternar entre clientes com contexto visual explícito.
- [ ] Oferecer transferência de cliente entre agência e titular direto com
  aceite das partes, auditoria e regra para faturas futuras.
- [ ] Separar branding, domínio, limites e relatórios por cliente final.
- [ ] Definir se a agência pode comprar assentos/instalações em atacado.
- [ ] Criar permissões granulares para billing, webhook, publicação e leitura
  de métricas.
- [ ] Adicionar exportação e exclusão de dados por organização.

### Stripe, afiliados e repasses

- [ ] Avaliar Stripe Connect somente quando o Nuncius precisar movimentar
  dinheiro para terceiros de forma recorrente.
- [ ] Antes do Connect, validar se payout manual mensal com relatório e nota
  fiscal atende ao volume e às obrigações locais.
- [ ] Se usar Connect, escolher conscientemente entre contas Standard, Express
  e Custom, considerando KYC, suporte, responsabilidade por saldo negativo e
  experiência do afiliado/agência.
- [ ] Não usar transferências automáticas antes de a receita superar o período
  de refund/chargeback.
- [ ] Criar ledger imutável de comissões com lançamentos:
  pending, available, paid, reversed e adjusted.
- [ ] Vincular cada lançamento à invoice, pagamento, afiliado, regra e versão
  do programa vigentes no momento da conversão.
- [ ] Versionar termos de comissão; alterações futuras não devem reescrever o
  passado silenciosamente.
- [ ] Gerar demonstrativo por período e conciliação entre Stripe, ledger e
  payout.
- [ ] Validar com assessoria contábil/jurídica impostos, documentos fiscais,
  retenções, LGPD e regras de marketplace antes de automatizar repasses.

### Custos e capacidade

- [ ] Criar showback interno de custo por tenant e chargeback para relay
  opcional.
- [ ] Projetar testes de carga separados para config CDN e relay.
- [ ] Definir limites de capacidade e plano de degradação antes de campanhas.
- [ ] Automatizar bloqueio de tenant quando custo/abuso ultrapassar orçamento.
- [ ] Revisar consultas e índices com dados representativos, incluindo
  paginação de projetos, snippets, memberships e audit logs.

### Gatilhos objetivos: Vercel versus Cloudflare

- [ ] Manter painel e APIs do plano de controle na Vercel enquanto:
  - a operação do Next.js for simples;
  - as franquias/custos forem previsíveis;
  - cache e WAF atenderem ao tráfego;
  - não houver requisito forte de multi-CDN.
- [ ] Não colocar Cloudflare na frente de todo o Next.js apenas por precaução;
  isso aumenta a complexidade de cache, RSC, cookies e troubleshooting.
- [ ] Avaliar um domínio dedicado de assets/config na Cloudflare quando:
  - edge requests ou egress do widget dominarem a conta Vercel;
  - for necessário cache mais controlável e independente do deploy do app;
  - houver demanda de purge/versionamento em grande escala;
  - for desejável isolar falhas do site administrativo.
- [ ] Preferir, nessa etapa, mover somente
  `cdn.nuncius.example` para Workers Static Assets/R2, mantendo o app na
  Vercel.
- [ ] Avaliar Cloudflare Workers para o relay opcional quando:
  - o volume sustentado justificar uma segunda runtime;
  - a espera de I/O e o egress forem os principais custos na Vercel;
  - rate limiting e roteamento no edge trouxerem ganho mensurável;
  - a equipe puder operar deploy, observabilidade e incidentes em dois
    provedores.
- [ ] Registrar a decisão em ADR com métricas reais, custo projetado,
  complexidade operacional, plano de rollback e data de revisão.

---

## Enterprise — governança, isolamento e escala avançada

- [ ] Oferecer SSO/SAML, SCIM e políticas de sessão por organização.
- [ ] Adicionar RBAC granular e papéis customizados.
- [ ] Disponibilizar audit log exportável e integração com SIEM.
- [ ] Definir residência de dados, retenção configurável e DPA.
- [ ] Oferecer chaves próprias, rotação de segredo e integração com secret
  managers.
- [ ] Avaliar isolamento regional ou infraestrutura dedicada para tenants de
  alto risco/volume.
- [ ] Oferecer domínios customizados e políticas próprias de WAF.
- [ ] Definir SLA, suporte, RTO/RPO e processo formal de incidentes.
- [ ] Criar controles de aprovação para alteração de endpoint, domínio e
  billing.
- [ ] Adicionar mTLS ou assinatura de requests entre front door e n8n quando o
  ambiente do cliente exigir.
- [ ] Permitir exportação de métricas e integração com observabilidade do
  cliente sem expor conteúdo das conversas.
- [ ] Avaliar faturamento por contrato, invoice e limites negociados, mantendo
  o mesmo ledger interno de entitlements e uso.

---

## Plano de migração da implementação atual

### Etapa 0 — instrumentar e congelar riscos

- [ ] Inventariar snippets ativos, domínios, uso de `projectId` legado,
  imagens base64 e volume de mensagens.
- [ ] Medir baseline de loads, mensagens, egress, latência e custo.
- [ ] Implantar limites defensivos no relay atual antes de divulgar o produto.

### Etapa 1 — publicar o novo contrato

- [ ] Adicionar versão de protocolo à config e ao widget.
- [ ] Permitir modo `direct` por snippet, mantendo `relay` temporário.
- [ ] Publicar template e checklist de segurança do endpoint do cliente.
- [ ] Criar teste de conectividade que valide CORS, timeout e formato da
  resposta sem armazenar mensagens.

### Etapa 2 — migrar assets e configuração

- [ ] Migrar imagens base64 para object storage em background.
- [ ] Manter leitura compatível durante a migração e remover a coluna pesada
  somente após confirmar adoção.
- [ ] Publicar script versionado e config cacheável.
- [ ] Validar cache purge, rollback e compatibilidade com snippets antigos.

### Etapa 3 — migrar o tráfego de mensagens

- [ ] Habilitar `direct` para novos snippets por padrão.
- [ ] Migrar clientes existentes em lotes, com métricas e rollback por tenant.
- [ ] Avisar clientes sobre requisitos de CORS, rate limit e front door.
- [x] Desativar `projectId` legado antecipadamente para fechar o bypass da
  política de origem.
- [ ] Transformar o relay em add-on com aceite, quota e preço explícitos.

### Etapa 4 — encerrar compatibilidade temporária

- [ ] Remover queries e payloads legados.
- [ ] Remover imagens base64 do hot path e do schema quando seguro.
- [ ] Revisar custos e SLOs após 30 dias de tráfego estável.
- [ ] Atualizar documentação, runbooks e matriz de suporte.

---

## Critérios de saída por fase

### MVP concluído

- [ ] Mensagens de novos clientes não atravessam o Nuncius por padrão.
- [ ] Widget e config são cacheáveis e assets pesados são imutáveis.
- [ ] Relay temporário possui quotas, rate limit, SSRF protection e kill switch.
- [ ] Conta, tenant, papéis e pagador têm modelos explícitos.
- [ ] Stripe é sincronizado por webhook idempotente.
- [ ] Custos e abuso são observáveis por tenant.

### Próxima fase concluída

- [ ] Agências administram clientes sem perda de isolamento.
- [ ] Atribuição e ledger de comissão são auditáveis e conciliáveis.
- [ ] Decisão Vercel/Cloudflare é baseada em métricas reais.
- [ ] Migração do tráfego legado foi concluída ou possui data final aprovada.

### Enterprise pronto

- [ ] SSO, RBAC, audit log, retenção e requisitos contratuais estão disponíveis.
- [ ] Isolamento, observabilidade e resposta a incidentes atendem aos SLOs
  acordados.
- [ ] Billing, comissões e payouts possuem conciliação financeira e trilha de
  auditoria completas.
