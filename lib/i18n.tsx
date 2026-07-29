"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export const SUPPORTED_LOCALES = ["pt-BR", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export type LocalePreference = Locale | "system";

const STORAGE_KEY = "nuncius:locale:v1";
const LOCALE_CHANGE_EVENT = "nuncius:locale-change";
let memoryLocale: LocalePreference | null = null;

const ptBR = {
  "common.close": "Fechar",
  "common.back": "Voltar",
  "common.cancel": "Cancelar",
  "common.save": "Salvar alterações",
  "common.create": "Criar",
  "common.delete": "Excluir",
  "common.edit": "Editar",
  "common.copy": "Copiar",
  "common.copied": "Copiado",
  "common.loading": "Carregando...",
  "common.tryAgain": "Tentar novamente",
  "common.language": "Idioma",
  "common.automatic": "Automático (navegador)",
  "common.portuguese": "Português",
  "common.english": "English",
  "common.operationError": "Não foi possível concluir a operação.",

  "home.publicNav": "Navegação pública",
  "home.howItWorks": "Como funciona",
  "home.features": "Recursos",
  "home.openAdmin": "Acessar painel",
  "home.badge": "Atendimento inteligente, do seu jeito",
  "home.title": "Transforme qualquer site em uma conversa.",
  "home.subtitle":
    "Crie widgets de chat, conecte seus workflows do n8n e publique em minutos — sem reconstruir seu site.",
  "home.start": "Começar agora",
  "home.seeHow": "Ver como funciona",
  "home.benefitNoCode": "Sem código complexo",
  "home.benefitN8n": "Integração com n8n",
  "home.benefitFast": "Instalação rápida",
  "home.assistant": "Assistente Nuncius",
  "home.online": "Online agora",
  "home.demoBot": "Olá! Como posso ajudar você hoje? 👋",
  "home.demoUser": "Quero saber mais sobre o produto.",
  "home.demoReply": "Claro! Vou encontrar as melhores informações para você.",
  "home.messagePlaceholder": "Digite sua mensagem...",
  "home.protectedWebhook": "Webhook protegido",
  "home.serverCredentials": "Credenciais no servidor",
  "home.connected": "Tudo conectado",
  "home.featuresTitle": "Do workflow ao seu site, sem atrito.",
  "home.featureInstallTitle": "Instale com uma linha",
  "home.featureInstallDescription":
    "Copie o snippet, cole no seu site e o widget começa a funcionar.",
  "home.featureN8nTitle": "Conectado ao seu n8n",
  "home.featureN8nDescription":
    "Cada projeto aponta para um workflow diferente, sem expor o webhook.",
  "home.featureSessionTitle": "Conversa persistente",
  "home.featureSessionDescription":
    "O visitante mantém a mesma sessão enquanto navega pelo seu site.",
  "home.threeSteps": "Três passos simples",
  "home.publishTitle": "Publique seu assistente em minutos.",
  "home.publishDescription":
    "O Nuncius cuida da conexão, da sessão e da interface. Você cuida da inteligência no n8n.",
  "home.stepProjectTitle": "Crie o projeto",
  "home.stepProjectDescription": "Defina o nome e informe o webhook.",
  "home.stepSnippetTitle": "Copie o snippet",
  "home.stepSnippetDescription": "Uma linha pronta para incorporar.",
  "home.stepChatTitle": "Comece a conversar",
  "home.stepChatDescription": "O widget aparece no seu site.",
  "home.rights": "Todos os direitos reservados.",

  "login.secureArea": "Área administrativa segura",
  "login.heroLine1": "Seus assistentes,",
  "login.heroLine2": "sob seu controle.",
  "login.heroDescription":
    "Gerencie projetos, webhooks e snippets de incorporação em um único lugar.",
  "login.benefitRestricted": "Acesso restrito a administradores",
  "login.benefitSession": "Sessão segura gerenciada pelo Supabase",
  "login.benefitWebhook": "Webhooks protegidos no servidor",
  "login.welcome": "Bem-vindo de volta",
  "login.title": "Acesse sua conta",
  "login.description": "Use as credenciais administrativas para continuar.",
  "login.email": "E-mail",
  "login.emailPlaceholder": "admin@empresa.com",
  "login.password": "Senha",
  "login.passwordPlaceholder": "Sua senha",
  "login.showPassword": "Mostrar senha",
  "login.hidePassword": "Ocultar senha",
  "login.submitting": "Entrando...",
  "login.submit": "Entrar no painel",
  "login.monitoring":
    "O acesso é monitorado e restrito a usuários autorizados.",

  "admin.mainNav": "Navegação principal",
  "admin.overview": "Visão geral",
  "admin.companies": "Empresas",
  "admin.settings": "Configurações",
  "admin.observability": "Observabilidade",
  "admin.howToConfigure": "Como configurar",
  "admin.closeMenu": "Fechar menu",
  "admin.openMenu": "Abrir menu",
  "admin.logout": "Sair",
  "admin.serviceHub": "Central de atendimento",
  "admin.description": "Gerencie empresas e seus snippets de atendimento.",
  "admin.newCompany": "Nova empresa",
  "admin.editCompany": "Editar empresa",
  "admin.createCompany": "Criar empresa",
  "admin.saveCompany": "Salvar alterações",
  "admin.searchCompanies": "Buscar empresas...",
  "admin.company": "empresa",
  "admin.companiesPlural": "empresas",
  "admin.connectionAttention": "A conexão precisa de atenção",
  "admin.loadingProjects": "Carregando projetos...",
  "admin.noCompany": "Nenhuma empresa encontrada",
  "admin.firstCompany": "Sua primeira empresa",
  "admin.searchAnother": "Tente buscar com outro nome.",
  "admin.firstCompanyDescription":
    "Cadastre um webhook do n8n e configure um ou mais snippets para incorporar.",
  "admin.projectName": "Nome",
  "admin.projectNamePlaceholder": "Ex.: Atendimento comercial",
  "admin.webhook": "Webhook do n8n",
  "admin.webhookDescription":
    "O Nuncius enviará projectId, sessionId e message via POST.",
  "admin.connectFlow": "Conecte o widget ao fluxo que responderá as mensagens.",
  "admin.deleteCompanyTitle": "Excluir “{name}”?",
  "admin.deleteCompanyDescription":
    "Todos os snippets dessa empresa deixarão de responder imediatamente. Esta ação não pode ser desfeita.",
  "admin.deleteCompany": "Excluir empresa",
  "admin.actionsFor": "Ações de {name}",
  "admin.active": "Ativo",
  "admin.createdAt": "Criado em",
  "admin.independentSnippets": "Snippets independentes",
  "admin.independentSnippetsDescription":
    "Configure ícone, cor, tema e posição para cada site.",
  "admin.manageSnippets": "Gerenciar snippets",
  "admin.loadError": "Erro ao carregar projetos.",
  "admin.saveError": "Erro ao salvar projeto.",
  "admin.deleteError": "Erro ao excluir projeto.",
  "admin.deleteRequestError": "Não foi possível excluir o projeto.",
  "admin.settingsTitle": "Preferências",
  "admin.settingsDescription":
    "Personalize como o painel é exibido neste navegador.",
  "admin.interfaceLanguage": "Idioma da interface",
  "admin.languageDescription":
    "Automático acompanha o idioma preferido do navegador. As outras opções ficam salvas neste navegador.",
  "admin.appearance": "Aparência",
  "admin.theme": "Tema",
  "admin.themeDescription": "Escolha como o painel é exibido. Automático acompanha o modo claro ou escuro do navegador.",
  "admin.themeSystem": "Automático",
  "admin.themeLight": "Claro",
  "admin.themeDark": "Escuro",

  "observability.title": "Observabilidade",
  "observability.description":
    "Uso do widget, desempenho e eventos de segurança.",
  "observability.privacy": "Dados anonimizados e sem conteúdo de conversas",
  "observability.summary": "Resumo operacional",
  "observability.widgetLoads": "Carregamentos do widget",
  "observability.uniqueSessions": "Sessões únicas",
  "observability.approximate": "Estimativa por identificador anonimizado",
  "observability.chatOpens": "Aberturas do chat",
  "observability.messages": "Mensagens solicitadas",
  "observability.successRate": "Taxa de sucesso",
  "observability.successes": "sucessos",
  "observability.failures": "falhas",
  "observability.averageLatency": "Latência média",
  "observability.auditEvents": "Eventos de auditoria",
  "observability.latestEvents": "Até 50 eventos recentes",
  "observability.period": "Período",
  "observability.retention": "Retenção detalhada de 90 dias",
  "observability.operatingSystems": "Sistemas operacionais",
  "observability.browsers": "Navegadores",
  "observability.devices": "Dispositivos",
  "observability.countries": "Países",
  "observability.origins": "Sites de origem",
  "observability.securityTimeline": "Linha do tempo de segurança",
  "observability.securityDescription":
    "Logins, bloqueios e alterações administrativas sem dados sensíveis.",
  "observability.noDeviceData": "Sem dados de dispositivo",
  "observability.noAuditEvents": "Nenhum evento no período selecionado.",

  "snippet.new": "Novo snippet",
  "snippet.managerTitle": "Snippets de {name}",
  "snippet.managerDescription":
    "Cada código pode ter aparência e posição próprias.",
  "snippet.changeScope": "As alterações afetam somente este código.",
  "snippet.loading": "Carregando snippets...",
  "snippet.newButton": "Novo snippet",
  "snippet.configure": "Configurar snippet",
  "snippet.create": "Criar snippet",
  "snippet.duplicate": "Duplicar",
  "snippet.delete": "Excluir snippet",
  "snippet.keepOne": "Cada empresa precisa ter ao menos um snippet",
  "snippet.name": "Nome",
  "snippet.launcher": "Botão de abertura",
  "snippet.icon": "Ícone",
  "snippet.image": "Imagem",
  "snippet.selectedImageAlt": "Imagem selecionada para o botão",
  "snippet.changeImage": "Trocar imagem",
  "snippet.uploadImage": "Enviar imagem",
  "snippet.imageHelp":
    "PNG ou WebP transparente, proporção 1:1, até 2 MB.",
  "snippet.primaryColor": "Cor primária",
  "snippet.theme": "Tema",
  "snippet.themeLight": "Claro",
  "snippet.themeDark": "Escuro",
  "snippet.themeSystem": "Sistema",
  "snippet.themeAttribute": "Atributo do script",
  "snippet.themeAttributeHelp":
    "Use data-theme=\"light\", dark ou system no script.",
  "snippet.position": "Posição",
  "snippet.positionBottomRight": "Inferior direita",
  "snippet.positionBottomLeft": "Inferior esquerda",
  "snippet.positionTopRight": "Superior direita",
  "snippet.positionTopLeft": "Superior esquerda",
  "snippet.webhookGreeting": "Saudação via webhook",
  "snippet.webhookGreetingDescription":
    "Ao abrir o chat, dispara o n8n e mostra somente a resposta dele.",
  "snippet.activationMessage": "Mensagem de ativação",
  "snippet.activationDescription":
    "Este texto é enviado como evento técnico e não aparece para o visitante.",
  "snippet.preview": "Pré-visualização",
  "snippet.embedCode": "Código de incorporação",
  "snippet.saveForCode":
    "Salve o snippet para gerar o código de incorporação.",
  "snippet.confirmDelete": "Excluir “{name}”?",
  "snippet.loadError": "Não foi possível carregar os snippets.",
  "snippet.processError": "Não foi possível processar a imagem.",
  "snippet.saveError": "Não foi possível salvar o snippet.",
  "snippet.duplicateError": "Não foi possível duplicar o snippet.",
  "snippet.deleteError": "Não foi possível excluir o snippet.",
  "snippet.invalidImageType": "Escolha uma imagem PNG ou WebP.",
  "snippet.imageTooLarge": "A imagem original deve ter no máximo 2 MB.",
  "snippet.imageReadError": "Não foi possível ler a imagem.",
  "snippet.imageDimensions":
    "A imagem deve ser quadrada (proporção 1:1) e ter até 4096 × 4096 px.",
  "snippet.imageTransparency":
    "A imagem precisa ter ao menos uma área transparente.",
  "snippet.iconMessage": "Mensagem",
  "snippet.iconConversations": "Conversas",
  "snippet.iconHeadphones": "Atendimento",
  "snippet.iconBot": "Robô",
  "snippet.iconHelp": "Ajuda",
};

type TranslationKey = keyof typeof ptBR;

const en: Record<TranslationKey, string> = {
  "common.close": "Close",
  "common.back": "Back",
  "common.cancel": "Cancel",
  "common.save": "Save changes",
  "common.create": "Create",
  "common.delete": "Delete",
  "common.edit": "Edit",
  "common.copy": "Copy",
  "common.copied": "Copied",
  "common.loading": "Loading...",
  "common.tryAgain": "Try again",
  "common.language": "Language",
  "common.automatic": "Automatic (browser)",
  "common.portuguese": "Português",
  "common.english": "English",
  "common.operationError": "Unable to complete the operation.",

  "home.publicNav": "Public navigation",
  "home.howItWorks": "How it works",
  "home.features": "Features",
  "home.openAdmin": "Open dashboard",
  "home.badge": "Smart support, your way",
  "home.title": "Turn any website into a conversation.",
  "home.subtitle":
    "Create chat widgets, connect your n8n workflows, and publish in minutes — without rebuilding your website.",
  "home.start": "Get started",
  "home.seeHow": "See how it works",
  "home.benefitNoCode": "No complex code",
  "home.benefitN8n": "n8n integration",
  "home.benefitFast": "Fast setup",
  "home.assistant": "Nuncius Assistant",
  "home.online": "Online now",
  "home.demoBot": "Hi! How can I help you today? 👋",
  "home.demoUser": "I’d like to learn more about the product.",
  "home.demoReply": "Of course! I’ll find the best information for you.",
  "home.messagePlaceholder": "Type your message...",
  "home.protectedWebhook": "Protected webhook",
  "home.serverCredentials": "Server-side credentials",
  "home.connected": "Everything connected",
  "home.featuresTitle": "From workflow to website, without friction.",
  "home.featureInstallTitle": "Install with one line",
  "home.featureInstallDescription":
    "Copy the snippet, paste it into your website, and the widget is ready.",
  "home.featureN8nTitle": "Connected to your n8n",
  "home.featureN8nDescription":
    "Each project points to a different workflow without exposing the webhook.",
  "home.featureSessionTitle": "Persistent conversation",
  "home.featureSessionDescription":
    "Visitors keep the same session as they browse your website.",
  "home.threeSteps": "Three simple steps",
  "home.publishTitle": "Publish your assistant in minutes.",
  "home.publishDescription":
    "Nuncius handles the connection, session, and interface. You handle the intelligence in n8n.",
  "home.stepProjectTitle": "Create the project",
  "home.stepProjectDescription": "Choose a name and enter the webhook.",
  "home.stepSnippetTitle": "Copy the snippet",
  "home.stepSnippetDescription": "One line, ready to embed.",
  "home.stepChatTitle": "Start chatting",
  "home.stepChatDescription": "The widget appears on your website.",
  "home.rights": "All rights reserved.",

  "login.secureArea": "Secure admin area",
  "login.heroLine1": "Your assistants,",
  "login.heroLine2": "under your control.",
  "login.heroDescription":
    "Manage projects, webhooks, and embed snippets in one place.",
  "login.benefitRestricted": "Administrator-only access",
  "login.benefitSession": "Secure session managed by Supabase",
  "login.benefitWebhook": "Server-protected webhooks",
  "login.welcome": "Welcome back",
  "login.title": "Sign in to your account",
  "login.description": "Use your administrator credentials to continue.",
  "login.email": "Email",
  "login.emailPlaceholder": "admin@company.com",
  "login.password": "Password",
  "login.passwordPlaceholder": "Your password",
  "login.showPassword": "Show password",
  "login.hidePassword": "Hide password",
  "login.submitting": "Signing in...",
  "login.submit": "Sign in to dashboard",
  "login.monitoring":
    "Access is monitored and restricted to authorized users.",

  "admin.mainNav": "Main navigation",
  "admin.overview": "Overview",
  "admin.companies": "Companies",
  "admin.settings": "Settings",
  "admin.observability": "Observability",
  "admin.howToConfigure": "Setup guide",
  "admin.closeMenu": "Close menu",
  "admin.openMenu": "Open menu",
  "admin.logout": "Sign out",
  "admin.serviceHub": "Service hub",
  "admin.description": "Manage companies and their support snippets.",
  "admin.newCompany": "New company",
  "admin.editCompany": "Edit company",
  "admin.createCompany": "Create company",
  "admin.saveCompany": "Save changes",
  "admin.searchCompanies": "Search companies...",
  "admin.company": "company",
  "admin.companiesPlural": "companies",
  "admin.connectionAttention": "The connection needs attention",
  "admin.loadingProjects": "Loading projects...",
  "admin.noCompany": "No company found",
  "admin.firstCompany": "Your first company",
  "admin.searchAnother": "Try searching for another name.",
  "admin.firstCompanyDescription":
    "Add an n8n webhook and configure one or more snippets to embed.",
  "admin.projectName": "Name",
  "admin.projectNamePlaceholder": "Example: Sales support",
  "admin.webhook": "n8n webhook",
  "admin.webhookDescription":
    "Nuncius will send projectId, sessionId, and message via POST.",
  "admin.connectFlow": "Connect the widget to the flow that will reply to messages.",
  "admin.deleteCompanyTitle": "Delete “{name}”?",
  "admin.deleteCompanyDescription":
    "All snippets for this company will stop responding immediately. This action cannot be undone.",
  "admin.deleteCompany": "Delete company",
  "admin.actionsFor": "Actions for {name}",
  "admin.active": "Active",
  "admin.createdAt": "Created",
  "admin.independentSnippets": "Independent snippets",
  "admin.independentSnippetsDescription":
    "Configure icon, color, theme, and position for each website.",
  "admin.manageSnippets": "Manage snippets",
  "admin.loadError": "Error loading projects.",
  "admin.saveError": "Error saving project.",
  "admin.deleteError": "Error deleting project.",
  "admin.deleteRequestError": "Unable to delete the project.",
  "admin.settingsTitle": "Preferences",
  "admin.settingsDescription":
    "Customize how the dashboard is displayed in this browser.",
  "admin.interfaceLanguage": "Interface language",
  "admin.languageDescription":
    "Automatic follows the browser’s preferred language. Other choices are saved in this browser.",
  "admin.appearance": "Appearance",
  "admin.theme": "Theme",
  "admin.themeDescription": "Choose how the dashboard is displayed. Automatic follows the browser’s light or dark mode.",
  "admin.themeSystem": "Automatic",
  "admin.themeLight": "Light",
  "admin.themeDark": "Dark",

  "observability.title": "Observability",
  "observability.description":
    "Widget usage, performance, and security events.",
  "observability.privacy": "Anonymized data with no conversation content",
  "observability.summary": "Operational summary",
  "observability.widgetLoads": "Widget loads",
  "observability.uniqueSessions": "Unique sessions",
  "observability.approximate": "Estimated using an anonymized identifier",
  "observability.chatOpens": "Chat opens",
  "observability.messages": "Messages requested",
  "observability.successRate": "Success rate",
  "observability.successes": "successes",
  "observability.failures": "failures",
  "observability.averageLatency": "Average latency",
  "observability.auditEvents": "Audit events",
  "observability.latestEvents": "Up to 50 recent events",
  "observability.period": "Period",
  "observability.retention": "90-day detailed retention",
  "observability.operatingSystems": "Operating systems",
  "observability.browsers": "Browsers",
  "observability.devices": "Devices",
  "observability.countries": "Countries",
  "observability.origins": "Origin websites",
  "observability.securityTimeline": "Security timeline",
  "observability.securityDescription":
    "Sign-ins, blocks, and administrative changes without sensitive data.",
  "observability.noDeviceData": "No device data",
  "observability.noAuditEvents": "No events in the selected period.",

  "snippet.new": "New snippet",
  "snippet.managerTitle": "Snippets for {name}",
  "snippet.managerDescription":
    "Each code can have its own appearance and position.",
  "snippet.changeScope": "Changes affect only this code.",
  "snippet.loading": "Loading snippets...",
  "snippet.newButton": "New snippet",
  "snippet.configure": "Configure snippet",
  "snippet.create": "Create snippet",
  "snippet.duplicate": "Duplicate",
  "snippet.delete": "Delete snippet",
  "snippet.keepOne": "Each company must keep at least one snippet",
  "snippet.name": "Name",
  "snippet.launcher": "Launcher button",
  "snippet.icon": "Icon",
  "snippet.image": "Image",
  "snippet.selectedImageAlt": "Image selected for the launcher",
  "snippet.changeImage": "Change image",
  "snippet.uploadImage": "Upload image",
  "snippet.imageHelp": "Transparent PNG or WebP, 1:1 ratio, up to 2 MB.",
  "snippet.primaryColor": "Primary color",
  "snippet.theme": "Theme",
  "snippet.themeLight": "Light",
  "snippet.themeDark": "Dark",
  "snippet.themeSystem": "System",
  "snippet.themeAttribute": "Script attribute",
  "snippet.themeAttributeHelp":
    "Use data-theme=\"light\", dark, or system in the script.",
  "snippet.position": "Position",
  "snippet.positionBottomRight": "Bottom right",
  "snippet.positionBottomLeft": "Bottom left",
  "snippet.positionTopRight": "Top right",
  "snippet.positionTopLeft": "Top left",
  "snippet.webhookGreeting": "Webhook greeting",
  "snippet.webhookGreetingDescription":
    "When the chat opens, it triggers n8n and displays only its response.",
  "snippet.activationMessage": "Activation message",
  "snippet.activationDescription":
    "This text is sent as a technical event and is not shown to the visitor.",
  "snippet.preview": "Preview",
  "snippet.embedCode": "Embed code",
  "snippet.saveForCode": "Save the snippet to generate the embed code.",
  "snippet.confirmDelete": "Delete “{name}”?",
  "snippet.loadError": "Unable to load snippets.",
  "snippet.processError": "Unable to process the image.",
  "snippet.saveError": "Unable to save the snippet.",
  "snippet.duplicateError": "Unable to duplicate the snippet.",
  "snippet.deleteError": "Unable to delete the snippet.",
  "snippet.invalidImageType": "Choose a PNG or WebP image.",
  "snippet.imageTooLarge": "The original image must be no larger than 2 MB.",
  "snippet.imageReadError": "Unable to read the image.",
  "snippet.imageDimensions":
    "The image must be square (1:1 ratio) and no larger than 4096 × 4096 px.",
  "snippet.imageTransparency":
    "The image must contain at least one transparent area.",
  "snippet.iconMessage": "Message",
  "snippet.iconConversations": "Conversations",
  "snippet.iconHeadphones": "Support",
  "snippet.iconBot": "Bot",
  "snippet.iconHelp": "Help",
};

const dictionaries: Record<Locale, Record<TranslationKey, string>> = {
  "pt-BR": ptBR,
  en,
};

function detectBrowserLocale(): Locale {
  const candidates = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];

  return candidates.some((language) =>
    language.toLowerCase().startsWith("pt"),
  )
    ? "pt-BR"
    : "en";
}

function getLocalePreference(): LocalePreference {
  try {
    const storedLocale = window.localStorage.getItem(STORAGE_KEY);
    if (storedLocale === "system" || SUPPORTED_LOCALES.includes(storedLocale as Locale)) {
      return storedLocale as LocalePreference;
    }
  } catch {
    if (memoryLocale) return memoryLocale;
  }

  return "system";
}

function getLocaleSnapshot(): Locale {
  const preference = getLocalePreference();
  return preference === "system" ? detectBrowserLocale() : preference;
}

function getServerLocaleSnapshot(): Locale {
  return "pt-BR";
}

function subscribeToLocale(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(LOCALE_CHANGE_EVENT, onStoreChange);
  window.addEventListener("languagechange", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(LOCALE_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("languagechange", onStoreChange);
  };
}

type I18nContextValue = {
  locale: Locale;
  preference: LocalePreference;
  setLocale: (locale: LocalePreference) => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const preference = useSyncExternalStore(
    subscribeToLocale,
    getLocalePreference,
    (): LocalePreference => "system",
  );
  const locale = useSyncExternalStore(
    subscribeToLocale,
    getLocaleSnapshot,
    getServerLocaleSnapshot,
  );

  const applyLocale = useCallback((nextLocale: LocalePreference) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, nextLocale);
    } catch {
      memoryLocale = nextLocale;
    }
    window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT));
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      preference,
      setLocale: applyLocale,
      t: (key) => dictionaries[locale][key],
    }),
    [applyLocale, locale, preference],
  );

  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used inside I18nProvider.");
  }
  return context;
}
