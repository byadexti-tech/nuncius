(function () {
  "use strict";

  function parseMessageParts(text) {
    var value = typeof text === "string" ? text : String(text || "");
    var linkPattern = /\[([^\]\r\n]+)\]\s*\((https?:\/\/[^\s)]+)\)/gi;
    var parts = [];
    var cursor = 0;
    var match;

    while ((match = linkPattern.exec(value)) !== null) {
      if (match.index > cursor) {
        parts.push({ type: "text", value: value.slice(cursor, match.index) });
      }
      parts.push({ type: "link", label: match[1].trim(), href: match[2] });
      cursor = match.index + match[0].length;
    }

    if (cursor < value.length || !parts.length) {
      parts.push({ type: "text", value: value.slice(cursor) });
    }

    return parts;
  }

  if (
    typeof globalThis !== "undefined" &&
    globalThis.__NUNCIUS_TEST_HOOKS__
  ) {
    globalThis.__NUNCIUS_TEST_HOOKS__.parseMessageParts = parseMessageParts;
  }

  var script = document.currentScript;
  if (!script) return;

  var snippetId = script.getAttribute("data-snippet-id");
  var legacyProjectId = script.getAttribute("data-project-id");
  var scriptUrl;
  try {
    scriptUrl = new URL(script.src);
  } catch {
    return;
  }

  var apiBase = (script.getAttribute("data-api-url") || scriptUrl.origin).replace(
    /\/$/,
    "",
  );
  var previewMode = false;
  if (
    script.getAttribute("data-preview") === "true" &&
    window.parent !== window
  ) {
    try {
      previewMode = window.parent.location.origin === scriptUrl.origin;
    } catch {
      previewMode = false;
    }
  }
  var previewOpen = script.getAttribute("data-preview-open") === "true";
  var previewTab = script.getAttribute("data-preview-tab");
  var widgetId = snippetId || legacyProjectId;
  if (!widgetId || document.querySelector("[data-nuncius-widget]")) {
    if (!widgetId) {
      console.error("[Nuncius] data-snippet-id não informado.");
    }
    return;
  }

  var defaults = {
    launcherType: "icon",
    launcherIcon: "message-circle",
    launcherImage: null,
    primaryColor: "#6D46E8",
    themeMode: "system",
    appearanceCustomizationsEnabled: false,
    lightBackgroundColor: "#FFFFFF",
    lightTextColor: "#172033",
    darkBackgroundColor: "#151823",
    darkTextColor: "#F4F5F8",
    lightPrimaryColor: "#6D46E8",
    lightPrimaryTextColor: "#FFFFFF",
    darkPrimaryColor: "#6D46E8",
    darkPrimaryTextColor: "#FFFFFF",
    hidePoweredBy: false,
    headerTitle: "Como podemos ajudar?",
    showOnlineStatus: true,
    fontFamily: "Inter",
    position: "bottom-right",
    autoStartEnabled: false,
    activationMode: "free_text",
    activationPrompt: "Escolha uma pergunta para começar",
    activationQuestions: [],
    showInputWithPredefinedQuestions: true,
    loadingMessages: [
      "Pesquisando...",
      "Analisando...",
      "Pensando...",
      "Escolhendo a melhor resposta...",
    ],
    introPhrases: [
      { text: "Uma revolução chegou para ficar.", durationMs: 2500 },
      { text: "A IA veio para revolucionar.", durationMs: 2500 },
      {
        text: "Mais ideias. Respostas mais rápidas. Novas possibilidades.",
        durationMs: 2500,
      },
      { text: "E agora, tudo isso está ao seu alcance.", durationMs: 2500 },
    ],
    authEnabled: false,
    authMode: "manual",
    authTitle: "Acesse sua conta",
    authDescription: "Entre para iniciar o atendimento.",
  };

  function loadConfig() {
    var previewConfig = script.getAttribute("data-preview-config");
    if (previewMode && previewConfig) {
      try {
        return Promise.resolve(
          Object.assign(
            {},
            defaults,
            JSON.parse(decodeURIComponent(previewConfig)),
          ),
        );
      } catch (error) {
        console.error("[Nuncius] Configuração de prévia inválida.", error);
      }
    }
    if (!snippetId) return Promise.resolve(defaults);
    return fetch(apiBase + "/api/widget/" + encodeURIComponent(snippetId))
      .then(function (response) {
        if (!response.ok) throw new Error("Configuração indisponível.");
        return response.json();
      })
      .then(function (data) {
        return Object.assign({}, defaults, data.config || {});
      })
      .catch(function (error) {
        console.error("[Nuncius]", error);
        return null;
      });
  }

  var bundledLauncherIconNames = [
    "message-circle",
    "messages-square",
    "headphones",
    "bot",
    "circle-help",
  ];

  function loadLauncherIcon(config) {
    if (
      config.launcherType === "image" ||
      bundledLauncherIconNames.indexOf(config.launcherIcon) !== -1
    ) {
      return Promise.resolve(null);
    }

    return fetch(
      apiBase + "/api/icons/" + encodeURIComponent(config.launcherIcon),
    )
      .then(function (response) {
        if (!response.ok) throw new Error("Ícone indisponível.");
        return response.text();
      })
      .catch(function (error) {
        console.error("[Nuncius]", error);
        return null;
      });
  }

  loadConfig().then(function (config) {
    if (!config) return;
    return loadLauncherIcon(config).then(function (launcherIconMarkup) {
      config.launcherIconMarkup = launcherIconMarkup;
      mountWidget(config);
    });
  });

  function mountWidget(config) {
    var introPhrases = Array.isArray(config.introPhrases)
      ? config.introPhrases
          .filter(function (phrase) {
            return (
              phrase &&
              typeof phrase.text === "string" &&
              phrase.text.trim() &&
              typeof phrase.durationMs === "number" &&
              Number.isFinite(phrase.durationMs)
            );
          })
          .slice(0, 10)
          .map(function (phrase) {
            return {
              text: phrase.text.trim().slice(0, 200),
              durationMs: Math.min(
                15000,
                Math.max(500, Math.round(phrase.durationMs)),
              ),
            };
          })
      : [];
    if (!introPhrases.length) introPhrases = defaults.introPhrases;
    var introTotalDuration = introPhrases.reduce(function (total, phrase) {
      return total + phrase.durationMs;
    }, 0);
    var storageKey = "nuncius:session:" + widgetId;
    var sessionId = null;
    try {
      sessionId = localStorage.getItem(storageKey);
    } catch {
      // Continue with an in-memory session if storage is unavailable.
    }
    if (!sessionId) {
      sessionId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Date.now().toString(36) + Math.random().toString(36).slice(2);
      try {
        localStorage.setItem(storageKey, sessionId);
      } catch {
        // Continue with the in-memory session.
      }
    }

    var host = document.createElement("div");
    host.setAttribute("data-nuncius-widget", widgetId);
    var shadow = host.attachShadow({ mode: "open" });
    document.body.appendChild(host);

    if (snippetId && !previewMode) {
      fetch(apiBase + "/api/telemetry/widget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snippetId: snippetId,
          sessionId: sessionId,
        }),
        keepalive: true,
      }).catch(function () {
        // Telemetry must never prevent the widget from loading.
      });
    }

    var style = document.createElement("style");
    style.textContent = [
      ":host{all:initial;color-scheme:light}",
      "*,*::before,*::after{box-sizing:border-box}",
      ".nc-wrap{--nc-primary:#6D46E8;--nc-button-text:#fff;--nc-surface:#fff;--nc-surface-soft:#f8f9fc;--nc-text:#172033;--nc-muted:#9298a8;--nc-border:#e7e9ef;--nc-shadow:rgba(30,22,60,.2);position:fixed;z-index:2147483647;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:var(--nc-text)}",
      ".nc-wrap.nc-bottom-right{right:22px;bottom:22px}.nc-wrap.nc-bottom-left{left:22px;bottom:22px}.nc-wrap.nc-top-right{right:22px;top:22px}.nc-wrap.nc-top-left{left:22px;top:22px}",
      ".nc-intro{position:absolute;inset:0;z-index:2;display:grid;place-items:center;overflow:hidden;padding:24px 16px;background:var(--nc-surface);color:var(--nc-text);border-radius:inherit;opacity:0;visibility:hidden;transition:opacity .32s ease,visibility .32s;isolation:isolate;touch-action:none;overscroll-behavior:contain;outline:none}",
      ".nc-intro::before,.nc-intro::after{content:'';position:absolute;z-index:0;width:310px;aspect-ratio:1;border-radius:50%;pointer-events:none;filter:blur(18px);will-change:transform,opacity}",
      ".nc-intro::before{left:-42%;top:-18%;background:radial-gradient(circle,color-mix(in srgb,var(--nc-primary) 68%,transparent) 0,color-mix(in srgb,var(--nc-primary) 28%,transparent) 38%,transparent 72%);opacity:.82;transform:translate3d(0,0,0) scale(.9)}",
      ".nc-intro::after{right:-44%;bottom:-20%;background:radial-gradient(circle,color-mix(in srgb,var(--nc-primary) 62%,transparent) 0,color-mix(in srgb,var(--nc-primary) 24%,transparent) 40%,transparent 72%);opacity:.76;transform:translate3d(0,0,0) scale(.94)}",
      ".nc-intro.nc-running::before{animation:nc-intro-orb-violet 9s ease-in-out infinite alternate}.nc-intro.nc-running::after{animation:nc-intro-orb-blue 11s ease-in-out infinite alternate}",
      ".nc-intro.nc-running{opacity:1;visibility:visible}",
      ".nc-intro-stage{position:relative;z-index:1;width:100%;height:100%;display:grid;place-items:center;text-align:center}",
      ".nc-intro-copy{position:relative;z-index:2;width:100%;height:220px;display:grid;place-items:center}",
      ".nc-intro-scene{position:absolute;margin:0;padding:0 8px;font-size:clamp(25px,8.5vw,36px);font-weight:750;line-height:1.04;letter-spacing:-.045em;text-wrap:balance;opacity:0;transform:translateY(30px) scale(.98)}",
      ".nc-intro.nc-running .nc-intro-scene{animation:nc-intro-copy var(--nc-intro-duration) cubic-bezier(.16,1,.3,1) both;animation-delay:var(--nc-intro-delay)}",
      ".nc-intro-progress{position:absolute;inset:auto 0 0;z-index:2;height:3px;background:var(--nc-border);overflow:hidden}.nc-intro-progress i{display:block;width:100%;height:100%;background:var(--nc-muted);transform:scaleX(0);transform-origin:left}",
      ".nc-intro.nc-running .nc-intro-progress i{animation:nc-intro-progress var(--nc-intro-total-duration) linear both}",
      ".nc-launcher{width:58px;height:58px;border:0;border-radius:18px;background:var(--nc-primary);color:var(--nc-button-text);display:grid;place-items:center;cursor:pointer;box-shadow:0 14px 38px color-mix(in srgb,var(--nc-primary) 42%,transparent);transition:transform .18s ease,filter .18s ease}",
      ".nc-launcher:hover,.nc-send:hover{filter:brightness(.9)}.nc-launcher:hover{transform:translateY(-2px)}.nc-launcher:focus-visible,.nc-send:focus-visible,.nc-header-button:focus-visible{outline:3px solid color-mix(in srgb,var(--nc-primary) 28%,transparent);outline-offset:3px}",
      ".nc-icon{width:25px;height:25px;display:block}",
      ".nc-image{width:36px;height:36px;display:block;object-fit:contain}.nc-avatar .nc-image{width:32px;height:32px}",
      ".nc-panel{position:absolute;z-index:1;width:min(380px,calc(100vw - 28px));height:clamp(420px,calc(100vh - 44px),600px);background:var(--nc-surface);border:1px solid var(--nc-border);border-radius:22px;box-shadow:0 24px 70px var(--nc-shadow);overflow:hidden;display:flex;flex-direction:column;opacity:0;visibility:hidden;transform:translateY(12px) scale(.98);transition:opacity .18s ease,transform .18s ease,visibility .18s}",
      ".nc-bottom-right .nc-panel{right:0;bottom:0;transform-origin:bottom right}.nc-bottom-left .nc-panel{left:0;bottom:0;transform-origin:bottom left}.nc-top-right .nc-panel{right:0;top:0;transform-origin:top right}.nc-top-left .nc-panel{left:0;top:0;transform-origin:top left}",
      ".nc-panel.nc-open{opacity:1;visibility:visible;transform:translateY(0) scale(1)}",
      ".nc-header{height:78px;flex:0 0 auto;padding:16px 16px 16px 18px;background:var(--nc-primary);color:var(--nc-button-text);display:flex;align-items:center;gap:12px}",
      ".nc-avatar{width:42px;height:42px;border-radius:13px;background:rgba(255,255,255,.18);display:grid;place-items:center}",
      ".nc-title{font-size:15px;font-weight:700;line-height:1.3}.nc-status{font-size:12px;opacity:.82;margin-top:3px;display:flex;align-items:center;gap:6px}.nc-dot{width:6px;height:6px;border-radius:50%;background:#6ee7b7}",
      ".nc-header-button{width:34px;height:34px;border:0;border-radius:9px;background:transparent;color:var(--nc-button-text);display:grid;place-items:center;cursor:pointer}.nc-header-button:hover{background:rgba(255,255,255,.13)}.nc-maximize{margin-left:auto}.nc-maximize-restore{display:none}.nc-panel.nc-maximized .nc-maximize-expand{display:none}.nc-panel.nc-maximized .nc-maximize-restore{display:block}",
      ".nc-auth{flex:1;display:grid;place-items:center;overflow-y:auto;padding:28px 24px;background:var(--nc-surface-soft)}.nc-auth[hidden]{display:none}.nc-auth-card{width:100%;max-width:300px;text-align:center}.nc-auth-icon{width:48px;height:48px;margin:0 auto 16px;border-radius:15px;background:color-mix(in srgb,var(--nc-primary) 12%,var(--nc-surface));color:var(--nc-primary);display:grid;place-items:center}.nc-auth-title{margin:0;font-size:20px;font-weight:700;line-height:1.25;color:var(--nc-text)}.nc-auth-description{margin:8px 0 20px;font-size:13px;line-height:1.55;color:var(--nc-muted)}.nc-auth-form{display:grid;gap:11px;text-align:left}.nc-auth-form[hidden]{display:none}.nc-auth-field{display:grid;gap:6px}.nc-auth-label{font-size:12px;font-weight:600;color:var(--nc-text)}.nc-auth-input{width:100%;height:43px;border:1px solid var(--nc-border);border-radius:12px;padding:0 12px;font:13.5px inherit;color:var(--nc-text);background:var(--nc-surface);outline:none}.nc-auth-input:focus{border-color:var(--nc-primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--nc-primary) 12%,transparent)}.nc-auth-submit{height:43px;margin-top:3px;border:0;border-radius:12px;background:var(--nc-primary);color:var(--nc-button-text);font:700 13px inherit;cursor:pointer}.nc-auth-submit:disabled{opacity:.55;cursor:default}.nc-auth-status{min-height:20px;margin:12px 0 0;font-size:12px;line-height:1.5;color:var(--nc-muted)}.nc-auth-status.nc-error{color:#dc2626}",
      ".nc-messages{flex:1;overflow-y:auto;padding:20px 16px;background:var(--nc-surface-soft);scroll-behavior:smooth}.nc-messages::-webkit-scrollbar{width:6px}.nc-messages::-webkit-scrollbar-thumb{background:var(--nc-border);border-radius:10px}",
      ".nc-messages[hidden]{display:none}",
      ".nc-starters{display:grid;gap:9px;min-height:100%;align-content:center;padding:8px 0}.nc-starters[hidden]{display:none}.nc-starters-title{margin:0 8px 32px;text-align:center;font-size:24px;font-weight:600;line-height:1.5;color:var(--nc-text)}.nc-starters.nc-entering .nc-starters-title{animation:nc-starters-title-in .65s cubic-bezier(.16,1,.3,1) both}.nc-starters-list{display:grid;gap:9px}.nc-starter{width:100%;max-width:300px;margin:0 auto;border:1px solid var(--nc-primary);border-radius:13px;padding:11px 13px;background:var(--nc-primary);color:var(--nc-button-text);font:700 13px/1.45 inherit;text-align:center;cursor:pointer;opacity:0;transition:filter .15s ease,transform .15s ease}.nc-starters.nc-entering .nc-starter{animation:nc-starter-in .65s cubic-bezier(.16,1,.3,1) calc(320ms + var(--nc-starter-delay,0ms)) both}.nc-starter:hover{filter:brightness(.92);transform:translateY(-1px)}.nc-starter:focus-visible{outline:0;box-shadow:0 0 0 3px color-mix(in srgb,var(--nc-primary) 24%,transparent)}.nc-starter:disabled{opacity:.55;cursor:default;transform:none}",
      ".nc-row{display:flex;margin-bottom:12px}.nc-row.nc-user{justify-content:flex-end}",
      ".nc-content{width:max-content;min-width:0;max-width:82%}.nc-bubble{padding:11px 13px;border-radius:15px;font-size:13.5px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere;word-break:normal;background:var(--nc-surface);color:var(--nc-text);border:1px solid var(--nc-border);border-bottom-left-radius:5px}.nc-row>.nc-bubble{max-width:82%}",
      ".nc-user .nc-bubble{background:var(--nc-primary);color:var(--nc-button-text);border-color:var(--nc-primary);border-bottom-left-radius:15px;border-bottom-right-radius:5px}",
      ".nc-message-link{display:inline-flex;align-items:center;justify-content:center;max-width:100%;margin:4px 0;padding:9px 12px;border-radius:10px;background:var(--nc-primary);color:var(--nc-button-text);font-weight:700;line-height:1.25;text-align:center;text-decoration:none;white-space:normal;transition:filter .15s ease,transform .15s ease}.nc-message-link:hover{filter:brightness(.92);transform:translateY(-1px)}.nc-message-link:focus-visible{outline:0;box-shadow:0 0 0 3px color-mix(in srgb,var(--nc-primary) 24%,transparent)}",
      ".nc-time{font-size:10px;color:var(--nc-muted);margin-top:5px;padding:0 4px}.nc-user .nc-time{text-align:right}",
      ".nc-compose{flex:0 0 auto;padding:12px;border-top:1px solid var(--nc-border);background:var(--nc-surface);display:flex;align-items:flex-end;gap:8px}.nc-compose[hidden]{display:none}",
      ".nc-input{min-width:0;flex:1;resize:none;max-height:96px;height:42px;border:1px solid var(--nc-border);border-radius:13px;padding:10px 12px;font:13.5px/20px inherit;color:var(--nc-text);background:var(--nc-surface);outline:none}.nc-input:focus{border-color:var(--nc-primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--nc-primary) 12%,transparent)}.nc-input::placeholder{color:var(--nc-muted)}",
      ".nc-send{width:42px;height:42px;flex:0 0 auto;border:0;border-radius:12px;background:var(--nc-primary);color:var(--nc-button-text);display:grid;place-items:center;cursor:pointer}.nc-send:disabled{opacity:.48;cursor:default}",
      ".nc-loading-message{display:inline-block;color:var(--nc-muted);font-size:12.5px;font-weight:500;animation:nc-loading-message-in .3s ease both}",
      "@keyframes nc-loading-message-in{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}",
      "@keyframes nc-starters-title-in{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}",
      "@keyframes nc-starter-in{from{opacity:0;transform:translateX(-40px)}to{opacity:1;transform:translateX(0)}}",
      "@keyframes nc-intro-orb-violet{0%{opacity:.62;transform:translate3d(-10px,-8px,0) scale(.86)}50%{opacity:.88;transform:translate3d(86px,74px,0) scale(1.08)}100%{opacity:.68;transform:translate3d(34px,170px,0) scale(.94)}}",
      "@keyframes nc-intro-orb-blue{0%{opacity:.58;transform:translate3d(8px,10px,0) scale(.9)}50%{opacity:.82;transform:translate3d(-92px,-82px,0) scale(1.1)}100%{opacity:.64;transform:translate3d(-42px,-176px,0) scale(.96)}}",
      "@keyframes nc-intro-copy{0%{opacity:0;transform:translateY(30px) scale(.98);filter:blur(8px)}16%,78%{opacity:1;transform:translateY(0) scale(1);filter:blur(0)}100%{opacity:0;transform:translateY(-24px) scale(1.015);filter:blur(6px)}}",
      "@keyframes nc-intro-progress{to{transform:scaleX(1)}}",
      ".nc-powered{text-align:center;font-size:9px;color:var(--nc-muted);background:var(--nc-surface);padding:0 0 8px}",
      ".nc-wrap.nc-dark{--nc-surface:#151823;--nc-surface-soft:#0f1119;--nc-text:#f4f5f8;--nc-muted:#949bad;--nc-border:#292e3d;--nc-shadow:rgba(0,0,0,.46)}",
      "@media(max-width:520px){.nc-wrap.nc-bottom-right,.nc-wrap.nc-top-right{right:14px}.nc-wrap.nc-bottom-left,.nc-wrap.nc-top-left{left:14px}.nc-wrap.nc-bottom-right,.nc-wrap.nc-bottom-left{bottom:14px}.nc-wrap.nc-top-right,.nc-wrap.nc-top-left{top:14px}.nc-panel,.nc-top-right .nc-panel,.nc-top-left .nc-panel{position:fixed;inset:12px;width:auto;height:auto;min-height:0;border-radius:19px}.nc-launcher{width:56px;height:56px}}",
      "@media(max-width:520px){.nc-intro{padding:24px 18px}.nc-intro-copy{height:250px}.nc-intro-scene{font-size:clamp(26px,8.5vw,38px)}}",
      ".nc-wrap .nc-panel.nc-maximized{position:fixed;inset:0;width:100svw;height:100svh;min-height:0;border:0;border-radius:0;transform-origin:center}",
      "@media(prefers-reduced-motion:reduce){.nc-panel,.nc-launcher,.nc-starter{transition:none}.nc-loading-message,.nc-starters-title,.nc-starter{animation:none}.nc-starter{opacity:1}.nc-starter:hover{transform:none}.nc-intro.nc-running::before,.nc-intro.nc-running::after,.nc-intro.nc-running .nc-intro-scene,.nc-intro.nc-running .nc-intro-progress i{animation:none}.nc-intro-scene{display:none}.nc-intro-scene:last-child{display:block;opacity:1;transform:none;filter:none}}",
    ].join("");

    var icons = {
      "message-circle":
        '<svg class="nc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 9h8M8 13h5"/></svg>',
      "messages-square":
        '<svg class="nc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h7"/><path d="M17 3h2a2 2 0 0 1 2 2v6l-3-2h-4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/></svg>',
      headphones:
        '<svg class="nc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 14a8 8 0 0 1 16 0"/><path d="M18 19c0 1.1-.9 2-2 2h-1v-7h3a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2ZM6 19a2 2 0 0 1-2-2v-1a2 2 0 0 1 2-2h3v7H8a2 2 0 0 1-2-2Z"/></svg>',
      bot:
        '<svg class="nc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="10" x="3" y="11" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4M8 16h.01M16 16h.01"/></svg>',
      "circle-help":
        '<svg class="nc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 1 1 5.3 1.9c-.9.8-2.4 1.3-2.4 3.1M12 18h.01"/></svg>',
    };
    var chatArtwork =
      config.launcherType === "image" &&
      typeof config.launcherImage === "string" &&
      config.launcherImage.indexOf("data:image/png;base64,") === 0
        ? '<img class="nc-image" src="' +
          config.launcherImage +
          '" alt="" aria-hidden="true">'
        : config.launcherIconMarkup ||
          icons[config.launcherIcon] ||
          icons["message-circle"];
    var closeIcon =
      '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
    var maximizeIcon =
      '<svg class="nc-maximize-expand" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></svg>' +
      '<svg class="nc-maximize-restore" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3v5H3M16 3v5h5M8 21v-5H3M16 21v-5h5"/></svg>';
    var sendIcon =
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>';
    var wrap = document.createElement("div");
    wrap.className = "nc-wrap nc-" + config.position;
    wrap.style.setProperty("--nc-primary", config.primaryColor);
    wrap.innerHTML =
      '<section class="nc-panel" role="dialog" aria-label="Chat Nuncius" aria-hidden="true">' +
      '<div class="nc-intro" aria-labelledby="nc-intro-title" aria-hidden="true" tabindex="-1">' +
      '<div class="nc-intro-stage"><div class="nc-intro-copy"></div></div>' +
      '<div class="nc-intro-progress" aria-hidden="true"><i></i></div></div>' +
      '<header class="nc-header"><div class="nc-avatar">' +
      chatArtwork +
      '</div><div><div class="nc-title"></div>' +
      (config.showOnlineStatus
        ? '<div class="nc-status"><span class="nc-dot"></span>Online agora</div>'
        : "") +
      "</div>" +
      '<button class="nc-header-button nc-maximize" type="button" aria-label="Maximizar chat" aria-pressed="false" title="Maximizar chat">' +
      maximizeIcon +
      '</button><button class="nc-header-button nc-close" type="button" aria-label="Fechar chat">' +
      closeIcon +
      "</button></header>" +
      '<div class="nc-auth" hidden tabindex="-1"><div class="nc-auth-card"><div class="nc-auth-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="10" rx="2"/><path d="M7 10V7a5 5 0 0 1 10 0v3"/></svg></div><h2 class="nc-auth-title"></h2><p class="nc-auth-description"></p>' +
      '<form class="nc-auth-form"><label class="nc-auth-field"><span class="nc-auth-label">Login</span><input class="nc-auth-input nc-auth-username" type="text" maxlength="254" autocomplete="username" required></label><label class="nc-auth-field"><span class="nc-auth-label">Senha</span><input class="nc-auth-input nc-auth-password" type="password" maxlength="512" autocomplete="current-password" required></label><button class="nc-auth-submit" type="submit">Entrar</button></form>' +
      '<p class="nc-auth-status" role="status" aria-live="polite"></p></div></div>' +
      '<div class="nc-messages" role="log" aria-live="polite"><div class="nc-starters" hidden><p class="nc-starters-title"></p><div class="nc-starters-list"></div></div></div>' +
      '<form class="nc-compose"><textarea class="nc-input" rows="1" maxlength="4000" placeholder="Digite sua mensagem..." aria-label="Mensagem"></textarea>' +
      '<button class="nc-send" type="submit" aria-label="Enviar mensagem">' +
      sendIcon +
      "</button></form>" +
      (config.hidePoweredBy
        ? ""
        : '<div class="nc-powered">Powered by Nuncius</div>') +
      "</section>" +
      '<button class="nc-launcher" type="button" aria-label="Abrir chat" aria-expanded="false">' +
      chatArtwork +
      "</button>";

    if (config.appearanceCustomizationsEnabled && /^[A-Za-z0-9 ]{1,80}$/.test(config.fontFamily)) {
      var fontLink = document.createElement("link");
      fontLink.rel = "stylesheet";
      fontLink.href = "https://fonts.googleapis.com/css2?family=" + encodeURIComponent(config.fontFamily).replace(/%20/g, "+") + ":wght@400;500;600;700&display=swap";
      shadow.appendChild(fontLink);
    }
    shadow.appendChild(style);
    shadow.appendChild(wrap);
    var introCopy = wrap.querySelector(".nc-intro-copy");
    var introDelay = 0;
    introPhrases.forEach(function (phrase, index) {
      var scene = document.createElement("p");
      scene.className = "nc-intro-scene";
      if (index === 0) scene.id = "nc-intro-title";
      scene.textContent = phrase.text;
      scene.style.setProperty("--nc-intro-duration", phrase.durationMs + "ms");
      scene.style.setProperty("--nc-intro-delay", introDelay + "ms");
      introCopy.appendChild(scene);
      introDelay += phrase.durationMs;
    });
    wrap
      .querySelector(".nc-intro")
      .style.setProperty("--nc-intro-total-duration", introTotalDuration + "ms");
    wrap.querySelector(".nc-title").textContent = config.headerTitle;

    var colorQuery = window.matchMedia("(prefers-color-scheme: dark)");
    function resolveTheme() {
      var mode = config.themeMode;
      if (mode === "attribute") {
        mode = (script.getAttribute("data-theme") || "system").toLowerCase();
      }
      var dark = mode === "dark" || (mode === "system" && colorQuery.matches);
      wrap.classList.toggle("nc-dark", dark);
      if (config.appearanceCustomizationsEnabled) {
        wrap.style.setProperty("--nc-primary", dark ? config.darkPrimaryColor : config.lightPrimaryColor);
        wrap.style.setProperty("--nc-button-text", dark ? config.darkPrimaryTextColor : config.lightPrimaryTextColor);
        wrap.style.setProperty("--nc-surface", dark ? config.darkBackgroundColor : config.lightBackgroundColor);
        wrap.style.setProperty("--nc-surface-soft", dark ? config.darkBackgroundColor : config.lightBackgroundColor);
        wrap.style.setProperty("--nc-text", dark ? config.darkTextColor : config.lightTextColor);
        wrap.style.fontFamily = '"' + config.fontFamily + '",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif';
      }
      host.style.colorScheme = dark ? "dark" : "light";
    }
    resolveTheme();
    if (config.themeMode === "system" || config.themeMode === "attribute") {
      colorQuery.addEventListener("change", resolveTheme);
    }
    if (config.themeMode === "attribute") {
      new MutationObserver(resolveTheme).observe(script, {
        attributes: true,
        attributeFilter: ["data-theme"],
      });
    }

    var panel = shadow.querySelector(".nc-panel");
    var launcher = shadow.querySelector(".nc-launcher");
    var maximizeButton = shadow.querySelector(".nc-maximize");
    var closeButton = shadow.querySelector(".nc-close");
    var intro = shadow.querySelector(".nc-intro");
    var authScreen = shadow.querySelector(".nc-auth");
    var authForm = shadow.querySelector(".nc-auth-form");
    var authTitle = shadow.querySelector(".nc-auth-title");
    var authDescription = shadow.querySelector(".nc-auth-description");
    var authUsername = shadow.querySelector(".nc-auth-username");
    var authPassword = shadow.querySelector(".nc-auth-password");
    var authSubmit = shadow.querySelector(".nc-auth-submit");
    var authStatus = shadow.querySelector(".nc-auth-status");
    var messages = shadow.querySelector(".nc-messages");
    var starters = shadow.querySelector(".nc-starters");
    var startersTitle = shadow.querySelector(".nc-starters-title");
    var startersList = shadow.querySelector(".nc-starters-list");
    var form = shadow.querySelector(".nc-compose");
    var input = shadow.querySelector(".nc-input");
    var sendButton = shadow.querySelector(".nc-send");
    var isOpen = false;
    var isMaximized = false;
    var sending = false;
    var authRequired = config.authEnabled === true;
    var authenticated = !authRequired;
    var authenticating = false;
    var authToken = "";
    var autoStartStarted = false;
    var activationQuestions = Array.isArray(config.activationQuestions)
      ? config.activationQuestions
          .filter(function (question) {
            return typeof question === "string" && question.trim();
          })
          .map(function (question) {
            return question.trim();
          })
      : [];
    var loadingMessages = Array.isArray(config.loadingMessages)
      ? config.loadingMessages
          .filter(function (message) {
            return typeof message === "string" && message.trim();
          })
          .map(function (message) {
            return message.trim();
          })
      : defaults.loadingMessages;
    if (!loadingMessages.length) loadingMessages = defaults.loadingMessages;
    var starterMode =
      config.activationMode === "predefined_questions" &&
      activationQuestions.length > 0;
    var introStorageKey = "nuncius:intro-dismissed:v1:" + widgetId;
    var introDismissed = false;
    var introTimer = null;
    var pageOverflowBeforeMaximize = "";
    authTitle.textContent =
      typeof config.authTitle === "string" && config.authTitle.trim()
        ? config.authTitle.trim()
        : defaults.authTitle;
    authDescription.textContent =
      typeof config.authDescription === "string"
        ? config.authDescription.trim()
        : defaults.authDescription;
    authForm.hidden = config.authMode === "automatic";
    authScreen.hidden = !authRequired;
    messages.hidden = authRequired;
    if (authRequired) form.hidden = true;
    startersTitle.textContent =
      typeof config.activationPrompt === "string" &&
      config.activationPrompt.trim()
        ? config.activationPrompt.trim()
        : defaults.activationPrompt;
    if (starterMode) {
      starters.hidden = false;
      form.hidden = authRequired || !config.showInputWithPredefinedQuestions;
      activationQuestions.forEach(function (question, index) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "nc-starter";
        button.textContent = question;
        button.dataset.question = question;
        button.style.setProperty("--nc-starter-delay", index * 70 + "ms");
        startersList.appendChild(button);
      });
    }
    try {
      introDismissed = localStorage.getItem(introStorageKey) === "true";
    } catch {
      // The presentation still works once per page when storage is unavailable.
    }

    function now() {
      return new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date());
    }

    function appendMessage(text, sender) {
      var row = document.createElement("div");
      row.className = "nc-row" + (sender === "user" ? " nc-user" : "");
      var content = document.createElement("div");
      content.className = "nc-content";
      var bubble = document.createElement("div");
      bubble.className = "nc-bubble";
      if (sender === "user") {
        bubble.textContent = text;
      } else {
        parseMessageParts(text).forEach(function (part) {
          if (part.type === "text") {
            bubble.appendChild(document.createTextNode(part.value));
            return;
          }
          var link = document.createElement("a");
          link.className = "nc-message-link";
          link.href = part.href;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = part.label;
          bubble.appendChild(link);
        });
      }
      var time = document.createElement("div");
      time.className = "nc-time";
      time.textContent = now();
      content.appendChild(bubble);
      content.appendChild(time);
      row.appendChild(content);
      messages.appendChild(row);
      messages.scrollTop = messages.scrollHeight;
      return row;
    }

    function appendTyping() {
      var row = document.createElement("div");
      row.className = "nc-row";
      row.setAttribute("role", "status");
      row.setAttribute("aria-live", "polite");
      row.setAttribute("aria-atomic", "true");
      var bubble = document.createElement("div");
      bubble.className = "nc-bubble";
      var message = document.createElement("span");
      message.className = "nc-loading-message";
      message.textContent = loadingMessages[0];
      bubble.appendChild(message);
      row.appendChild(bubble);
      messages.appendChild(row);
      messages.scrollTop = messages.scrollHeight;
      var messageIndex = 0;
      var timer = window.setInterval(function () {
        messageIndex = (messageIndex + 1) % loadingMessages.length;
        message.classList.remove("nc-loading-message");
        void message.offsetWidth;
        message.textContent = loadingMessages[messageIndex];
        message.classList.add("nc-loading-message");
        messages.scrollTop = messages.scrollHeight;
      }, 1800);
      return {
        remove: function () {
          window.clearInterval(timer);
          row.remove();
        },
      };
    }

    function playStarterEntrance() {
      if (!starterMode || starters.hidden) return;
      starters.classList.remove("nc-entering");
      void starters.offsetWidth;
      starters.classList.add("nc-entering");
    }

    function setAuthStatus(message, isError) {
      authStatus.textContent = message || "";
      authStatus.classList.toggle("nc-error", isError === true);
    }

    function showAuthentication(message) {
      authenticated = false;
      authToken = "";
      authScreen.hidden = false;
      messages.hidden = true;
      form.hidden = true;
      setAuthStatus(message || "", !!message);
      authPassword.value = "";
      if (isOpen && config.authMode === "manual") {
        window.setTimeout(function () {
          authUsername.focus();
        }, 0);
      }
    }

    function unlockChat(token) {
      authenticated = true;
      authToken = token;
      authScreen.hidden = true;
      messages.hidden = false;
      setAuthStatus("", false);
      form.hidden =
        starterMode && !config.showInputWithPredefinedQuestions;
      startConversation();
      if (starterMode) playStarterEntrance();
      if (isOpen) {
        window.setTimeout(function () {
          var firstStarter = startersList.querySelector(".nc-starter");
          if (starterMode && firstStarter) firstStarter.focus();
          else input.focus();
        }, 0);
      }
    }

    function requestAuthentication(payload) {
      if (authenticating) return Promise.resolve(null);
      authenticating = true;
      authSubmit.disabled = true;
      setAuthStatus("Validando acesso...", false);

      return fetch(
        apiBase +
          "/api/widget/" +
          encodeURIComponent(snippetId || "") +
          "/auth",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            Object.assign({ sessionId: sessionId }, payload),
          ),
        },
      )
        .then(function (response) {
          return response
            .json()
            .catch(function () {
              return {};
            })
            .then(function (data) {
              if (!response.ok) {
                var error = new Error(
                  data.error || "Não foi possível validar o acesso.",
                );
                error.status = response.status;
                throw error;
              }
              return data;
            });
        })
        .then(function (data) {
          if (
            !data ||
            data.authenticated !== true ||
            typeof data.authToken !== "string"
          ) {
            throw new Error("O n8n não confirmou a autenticação.");
          }
          unlockChat(data.authToken);
          return data;
        })
        .catch(function (error) {
          showAuthentication(
            error instanceof Error
              ? error.message
              : "Não foi possível validar o acesso.",
          );
          return null;
        })
        .finally(function () {
          authenticating = false;
          authSubmit.disabled = false;
        });
    }

    function authenticateAutomatically(token) {
      if (
        !authRequired ||
        config.authMode !== "automatic" ||
        authenticated ||
        authenticating
      ) {
        return;
      }
      if (!token) {
        showAuthentication(
          "Não foi possível identificar sua sessão automaticamente.",
        );
        return;
      }
      void requestAuthentication({ method: "automatic", token: token });
    }

    function toggle(open) {
      isOpen = typeof open === "boolean" ? open : !isOpen;
      panel.classList.toggle("nc-open", isOpen);
      panel.setAttribute("aria-hidden", String(!isOpen));
      launcher.setAttribute("aria-expanded", String(isOpen));
      launcher.setAttribute("aria-label", isOpen ? "Fechar chat" : "Abrir chat");
      if (isOpen) {
        if (authRequired && !authenticated) {
          if (config.authMode === "automatic") {
            authenticateAutomatically(script.getAttribute("data-auth-token"));
          }
        } else {
          startConversation();
        }
        if (authenticated && !starters.hidden) {
          window.setTimeout(function () {
            if (isOpen) playStarterEntrance();
          }, 220);
        }
        window.setTimeout(function () {
          if (authRequired && !authenticated) {
            if (config.authMode === "manual") authUsername.focus();
            else authScreen.focus();
            return;
          }
          var firstStarter = startersList.querySelector(".nc-starter");
          if (starterMode && firstStarter) firstStarter.focus();
          else input.focus();
        }, 100);
      } else {
        setMaximized(false);
      }
    }

    function setMaximized(maximized) {
      if (isMaximized === maximized) return;
      isMaximized = maximized;
      panel.classList.toggle("nc-maximized", isMaximized);
      maximizeButton.setAttribute("aria-pressed", String(isMaximized));
      maximizeButton.setAttribute(
        "aria-label",
        isMaximized ? "Restaurar tamanho do chat" : "Maximizar chat",
      );
      maximizeButton.title = isMaximized
        ? "Restaurar tamanho do chat"
        : "Maximizar chat";
      if (isMaximized) {
        pageOverflowBeforeMaximize = document.documentElement.style.overflow;
        document.documentElement.style.overflow = "hidden";
      } else {
        document.documentElement.style.overflow = pageOverflowBeforeMaximize;
      }
      messages.scrollTop = messages.scrollHeight;
    }

    function rememberIntroChoice() {
      introDismissed = true;
      try {
        localStorage.setItem(introStorageKey, "true");
      } catch {
        // Keep the in-memory choice for the current page.
      }
    }

    function handleIntroKeydown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        completeIntro();
      }
    }

    function stopIntro() {
      if (!intro.classList.contains("nc-running")) return;
      if (introTimer !== null) {
        window.clearTimeout(introTimer);
        introTimer = null;
      }
      intro.classList.remove("nc-running");
      intro.setAttribute("aria-hidden", "true");
      document.removeEventListener("keydown", handleIntroKeydown);
    }

    function completeIntro() {
      if (!intro.classList.contains("nc-running")) return;
      stopIntro();
      rememberIntroChoice();
      toggle(true);
    }

    function showIntro() {
      isOpen = true;
      panel.classList.add("nc-open");
      panel.setAttribute("aria-hidden", "false");
      launcher.setAttribute("aria-expanded", "true");
      launcher.setAttribute("aria-label", "Fechar chat");
      intro.setAttribute("aria-hidden", "false");
      intro.classList.add("nc-running");
      document.addEventListener("keydown", handleIntroKeydown);
      intro.focus();
      var reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      introTimer = window.setTimeout(
        completeIntro,
        reducedMotion ? 1200 : introTotalDuration,
      );
    }

    function requestReply(payload) {
      return fetch(apiBase + "/api/chat?snippetId=" + encodeURIComponent(snippetId || ""), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          Object.assign(
            {
              snippetId: snippetId,
              projectId: legacyProjectId,
              sessionId: sessionId,
              authToken: authToken || undefined,
            },
            payload,
          ),
        ),
      }).then(function (response) {
        return response
          .json()
          .catch(function () {
            return {};
          })
          .then(function (data) {
            if (!response.ok) {
              var error = new Error(
                data.error || "Não foi possível obter uma resposta.",
              );
              error.status = response.status;
              throw error;
            }
            return data;
          });
      });
    }

    function setStarterButtonsDisabled(disabled) {
      startersList.querySelectorAll(".nc-starter").forEach(function (button) {
        button.disabled = disabled;
      });
    }

    function startConversation() {
      if (
        !authenticated ||
        !config.autoStartEnabled ||
        autoStartStarted
      ) {
        return;
      }

      autoStartStarted = true;
      sending = true;
      sendButton.disabled = true;
      input.disabled = true;
      setStarterButtonsDisabled(true);
      if (starterMode) starters.hidden = true;
      var typing = appendTyping();

      requestReply({ event: "chat_opened" })
        .then(function (data) {
          typing.remove();
          if (data.reply) appendMessage(data.reply, "bot");
        })
        .catch(function (error) {
          console.error("[Nuncius] Falha ao iniciar conversa:", error);
          typing.remove();
          if (error && error.status === 401) {
            showAuthentication(error.message);
          } else {
            appendMessage("Olá! 👋 Como posso ajudar você hoje?", "bot");
          }
        })
        .finally(function () {
          sending = false;
          sendButton.disabled = false;
          input.disabled = false;
          setStarterButtonsDisabled(false);
          if (starterMode) {
            messages.appendChild(starters);
            starters.hidden = false;
            messages.scrollTop = messages.scrollHeight;
            playStarterEntrance();
            var firstStarter = startersList.querySelector(".nc-starter");
            if (firstStarter) firstStarter.focus();
          } else {
            input.focus();
          }
        });
    }

    function sendMessage(message) {
      if (!authenticated || !message || sending) return;

      sending = true;
      sendButton.disabled = true;
      input.disabled = true;
      setStarterButtonsDisabled(true);
      appendMessage(message, "user");
      input.value = "";
      input.style.height = "42px";
      var typing = appendTyping();

      requestReply({ message: message })
        .then(function (data) {
          typing.remove();
          appendMessage(data.reply, "bot");
        })
        .catch(function (error) {
          typing.remove();
          if (error && error.status === 401) {
            showAuthentication(error.message);
          } else {
            appendMessage(
              error instanceof Error
                ? error.message
                : "Não foi possível enviar a mensagem. Tente novamente.",
              "bot",
            );
          }
        })
        .finally(function () {
          sending = false;
          sendButton.disabled = false;
          input.disabled = false;
          input.focus();
        });
    }

    if (!config.autoStartEnabled && !starterMode) {
      appendMessage("Olá! 👋 Como posso ajudar você hoje?", "bot");
    }

    authForm.addEventListener("submit", function (event) {
      event.preventDefault();
      if (config.authMode !== "manual" || authenticating) return;
      void requestAuthentication({
        method: "manual",
        username: authUsername.value.trim(),
        password: authPassword.value,
      });
    });

    window.addEventListener("nuncius:authenticate", function (event) {
      var detail = event && event.detail;
      if (
        !detail ||
        (detail.snippetId && detail.snippetId !== snippetId) ||
        typeof detail.token !== "string"
      ) {
        return;
      }
      script.setAttribute("data-auth-token", detail.token);
      authenticateAutomatically(detail.token);
    });

    if (authRequired && config.authMode === "automatic") {
      authenticateAutomatically(script.getAttribute("data-auth-token"));
    }

    launcher.addEventListener("click", function () {
      if (intro.classList.contains("nc-running")) {
        stopIntro();
        toggle(false);
        launcher.focus();
        return;
      }
      if (isOpen) {
        toggle(false);
        return;
      }
      if (!introDismissed) {
        showIntro();
        return;
      }
      toggle(true);
    });
    maximizeButton.addEventListener("click", function () {
      setMaximized(!isMaximized);
    });
    closeButton.addEventListener("click", function () {
      toggle(false);
      launcher.focus();
    });
    startersList.addEventListener("click", function (event) {
      var button = event.target.closest(".nc-starter");
      if (!button || sending) return;

      var question = button.dataset.question || "";
      starterMode = false;
      starters.hidden = true;
      form.hidden = false;
      sendMessage(question);
    });
    input.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
      }
    });
    input.addEventListener("input", function () {
      input.style.height = "42px";
      input.style.height = Math.min(input.scrollHeight, 96) + "px";
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var message = input.value.trim();
      if (message && starterMode) {
        starterMode = false;
        starters.hidden = true;
      }
      sendMessage(message);
    });

    if (previewOpen && previewMode && previewTab === "behavior") {
      showIntro();
    } else if (previewOpen) {
      isOpen = true;
      panel.classList.add("nc-open");
      panel.setAttribute("aria-hidden", "false");
      launcher.setAttribute("aria-expanded", "true");
      launcher.setAttribute("aria-label", "Fechar chat");
      if (starterMode) playStarterEntrance();
    }
  }
})();
