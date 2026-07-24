(function () {
  "use strict";

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
  var widgetId = snippetId || legacyProjectId;
  if (!widgetId || document.querySelector("[data-nuncius-widget]")) {
    if (!widgetId) {
      console.error("[Nuncius] data-snippet-id não informado.");
    }
    return;
  }

  var defaults = {
    launcherIcon: "message-circle",
    primaryColor: "#6D46E8",
    themeMode: "system",
    position: "bottom-right",
  };

  function loadConfig() {
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
        return defaults;
      });
  }

  loadConfig().then(function (config) {
    mountWidget(config);
  });

  function mountWidget(config) {
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

    var style = document.createElement("style");
    style.textContent = [
      ":host{all:initial;color-scheme:light}",
      "*,*::before,*::after{box-sizing:border-box}",
      ".nc-wrap{--nc-primary:#6D46E8;--nc-surface:#fff;--nc-surface-soft:#f8f9fc;--nc-text:#172033;--nc-muted:#9298a8;--nc-border:#e7e9ef;--nc-shadow:rgba(30,22,60,.2);position:fixed;z-index:2147483647;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:var(--nc-text)}",
      ".nc-wrap.nc-bottom-right{right:22px;bottom:22px}.nc-wrap.nc-bottom-left{left:22px;bottom:22px}.nc-wrap.nc-top-right{right:22px;top:22px}.nc-wrap.nc-top-left{left:22px;top:22px}",
      ".nc-launcher{width:58px;height:58px;border:0;border-radius:18px;background:var(--nc-primary);color:#fff;display:grid;place-items:center;cursor:pointer;box-shadow:0 14px 38px color-mix(in srgb,var(--nc-primary) 42%,transparent);transition:transform .18s ease,filter .18s ease}",
      ".nc-launcher:hover,.nc-send:hover{filter:brightness(.9)}.nc-launcher:hover{transform:translateY(-2px)}.nc-launcher:focus-visible,.nc-send:focus-visible,.nc-close:focus-visible{outline:3px solid color-mix(in srgb,var(--nc-primary) 28%,transparent);outline-offset:3px}",
      ".nc-icon{width:25px;height:25px;display:block}",
      ".nc-panel{position:absolute;width:min(380px,calc(100vw - 28px));height:min(600px,calc(100vh - 120px));min-height:420px;background:var(--nc-surface);border:1px solid var(--nc-border);border-radius:22px;box-shadow:0 24px 70px var(--nc-shadow);overflow:hidden;display:flex;flex-direction:column;opacity:0;visibility:hidden;transform:translateY(12px) scale(.98);transition:opacity .18s ease,transform .18s ease,visibility .18s}",
      ".nc-bottom-right .nc-panel{right:0;bottom:72px;transform-origin:bottom right}.nc-bottom-left .nc-panel{left:0;bottom:72px;transform-origin:bottom left}.nc-top-right .nc-panel{right:0;top:72px;transform-origin:top right}.nc-top-left .nc-panel{left:0;top:72px;transform-origin:top left}",
      ".nc-panel.nc-open{opacity:1;visibility:visible;transform:translateY(0) scale(1)}",
      ".nc-header{height:78px;flex:0 0 auto;padding:16px 16px 16px 18px;background:var(--nc-primary);color:#fff;display:flex;align-items:center;gap:12px}",
      ".nc-avatar{width:42px;height:42px;border-radius:13px;background:rgba(255,255,255,.18);display:grid;place-items:center}",
      ".nc-title{font-size:15px;font-weight:700;line-height:1.3}.nc-status{font-size:12px;opacity:.82;margin-top:3px;display:flex;align-items:center;gap:6px}.nc-dot{width:6px;height:6px;border-radius:50%;background:#6ee7b7}",
      ".nc-close{margin-left:auto;width:34px;height:34px;border:0;border-radius:9px;background:transparent;color:#fff;display:grid;place-items:center;cursor:pointer}.nc-close:hover{background:rgba(255,255,255,.13)}",
      ".nc-messages{flex:1;overflow-y:auto;padding:20px 16px;background:var(--nc-surface-soft);scroll-behavior:smooth}.nc-messages::-webkit-scrollbar{width:6px}.nc-messages::-webkit-scrollbar-thumb{background:var(--nc-border);border-radius:10px}",
      ".nc-row{display:flex;margin-bottom:12px}.nc-row.nc-user{justify-content:flex-end}",
      ".nc-bubble{max-width:82%;padding:11px 13px;border-radius:15px;font-size:13.5px;line-height:1.5;white-space:pre-wrap;word-break:break-word;background:var(--nc-surface);color:var(--nc-text);border:1px solid var(--nc-border);border-bottom-left-radius:5px}",
      ".nc-user .nc-bubble{background:var(--nc-primary);color:#fff;border-color:var(--nc-primary);border-bottom-left-radius:15px;border-bottom-right-radius:5px}",
      ".nc-time{font-size:10px;color:var(--nc-muted);margin-top:5px;padding:0 4px}.nc-user .nc-time{text-align:right}",
      ".nc-compose{flex:0 0 auto;padding:12px;border-top:1px solid var(--nc-border);background:var(--nc-surface);display:flex;align-items:flex-end;gap:8px}",
      ".nc-input{min-width:0;flex:1;resize:none;max-height:96px;height:42px;border:1px solid var(--nc-border);border-radius:13px;padding:10px 12px;font:13.5px/20px inherit;color:var(--nc-text);background:var(--nc-surface);outline:none}.nc-input:focus{border-color:var(--nc-primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--nc-primary) 12%,transparent)}.nc-input::placeholder{color:var(--nc-muted)}",
      ".nc-send{width:42px;height:42px;flex:0 0 auto;border:0;border-radius:12px;background:var(--nc-primary);color:#fff;display:grid;place-items:center;cursor:pointer}.nc-send:disabled{opacity:.48;cursor:default}",
      ".nc-typing{display:inline-flex;gap:4px;align-items:center;height:18px}.nc-typing i{width:5px;height:5px;border-radius:50%;background:var(--nc-muted);animation:nc-pulse 1.2s infinite}.nc-typing i:nth-child(2){animation-delay:.15s}.nc-typing i:nth-child(3){animation-delay:.3s}",
      "@keyframes nc-pulse{0%,60%,100%{opacity:.35;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}",
      ".nc-powered{text-align:center;font-size:9px;color:var(--nc-muted);background:var(--nc-surface);padding:0 0 8px}",
      ".nc-wrap.nc-dark{--nc-surface:#151823;--nc-surface-soft:#0f1119;--nc-text:#f4f5f8;--nc-muted:#949bad;--nc-border:#292e3d;--nc-shadow:rgba(0,0,0,.46)}",
      "@media(max-width:520px){.nc-wrap.nc-bottom-right,.nc-wrap.nc-top-right{right:14px}.nc-wrap.nc-bottom-left,.nc-wrap.nc-top-left{left:14px}.nc-wrap.nc-bottom-right,.nc-wrap.nc-bottom-left{bottom:14px}.nc-wrap.nc-top-right,.nc-wrap.nc-top-left{top:14px}.nc-panel{position:fixed;inset:12px 12px 84px;width:auto;height:auto;min-height:0;border-radius:19px}.nc-top-right .nc-panel,.nc-top-left .nc-panel{inset:84px 12px 12px}.nc-launcher{width:56px;height:56px}}",
      "@media(prefers-reduced-motion:reduce){.nc-panel,.nc-launcher{transition:none}.nc-typing i{animation:none}}",
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
    var chatIcon = icons[config.launcherIcon] || icons["message-circle"];
    var closeIcon =
      '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
    var sendIcon =
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>';

    var wrap = document.createElement("div");
    wrap.className = "nc-wrap nc-" + config.position;
    wrap.style.setProperty("--nc-primary", config.primaryColor);
    wrap.innerHTML =
      '<section class="nc-panel" role="dialog" aria-label="Chat Nuncius" aria-hidden="true">' +
      '<header class="nc-header"><div class="nc-avatar">' +
      chatIcon +
      '</div><div><div class="nc-title">Como podemos ajudar?</div><div class="nc-status"><span class="nc-dot"></span>Online agora</div></div>' +
      '<button class="nc-close" type="button" aria-label="Fechar chat">' +
      closeIcon +
      "</button></header>" +
      '<div class="nc-messages" role="log" aria-live="polite"></div>' +
      '<form class="nc-compose"><textarea class="nc-input" rows="1" maxlength="4000" placeholder="Digite sua mensagem..." aria-label="Mensagem"></textarea>' +
      '<button class="nc-send" type="submit" aria-label="Enviar mensagem">' +
      sendIcon +
      "</button></form>" +
      '<div class="nc-powered">Powered by Nuncius</div></section>' +
      '<button class="nc-launcher" type="button" aria-label="Abrir chat" aria-expanded="false">' +
      chatIcon +
      "</button>";

    shadow.appendChild(style);
    shadow.appendChild(wrap);

    var colorQuery = window.matchMedia("(prefers-color-scheme: dark)");
    function resolveTheme() {
      var mode = config.themeMode;
      if (mode === "attribute") {
        mode = (script.getAttribute("data-theme") || "system").toLowerCase();
      }
      var dark = mode === "dark" || (mode === "system" && colorQuery.matches);
      wrap.classList.toggle("nc-dark", dark);
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
    var closeButton = shadow.querySelector(".nc-close");
    var messages = shadow.querySelector(".nc-messages");
    var form = shadow.querySelector(".nc-compose");
    var input = shadow.querySelector(".nc-input");
    var sendButton = shadow.querySelector(".nc-send");
    var isOpen = false;
    var sending = false;

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
      var bubble = document.createElement("div");
      bubble.className = "nc-bubble";
      bubble.textContent = text;
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
      row.setAttribute("aria-label", "Assistente digitando");
      row.innerHTML =
        '<div class="nc-bubble"><span class="nc-typing"><i></i><i></i><i></i></span></div>';
      messages.appendChild(row);
      messages.scrollTop = messages.scrollHeight;
      return row;
    }

    function toggle(open) {
      isOpen = typeof open === "boolean" ? open : !isOpen;
      panel.classList.toggle("nc-open", isOpen);
      panel.setAttribute("aria-hidden", String(!isOpen));
      launcher.setAttribute("aria-expanded", String(isOpen));
      launcher.setAttribute("aria-label", isOpen ? "Fechar chat" : "Abrir chat");
      if (isOpen) {
        window.setTimeout(function () {
          input.focus();
        }, 100);
      }
    }

    appendMessage("Olá! 👋 Como posso ajudar você hoje?", "bot");

    launcher.addEventListener("click", function () {
      toggle();
    });
    closeButton.addEventListener("click", function () {
      toggle(false);
      launcher.focus();
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
      if (!message || sending) return;

      sending = true;
      sendButton.disabled = true;
      input.disabled = true;
      appendMessage(message, "user");
      input.value = "";
      input.style.height = "42px";
      var typing = appendTyping();

      fetch(apiBase + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snippetId: snippetId,
          projectId: legacyProjectId,
          sessionId: sessionId,
          message: message,
        }),
      })
        .then(function (response) {
          return response
            .json()
            .catch(function () {
              return {};
            })
            .then(function (data) {
              if (!response.ok) {
                throw new Error(
                  data.error || "Não foi possível obter uma resposta.",
                );
              }
              return data;
            });
        })
        .then(function (data) {
          typing.remove();
          appendMessage(data.reply, "bot");
        })
        .catch(function (error) {
          typing.remove();
          appendMessage(
            error instanceof Error
              ? error.message
              : "Não foi possível enviar a mensagem. Tente novamente.",
            "bot",
          );
        })
        .finally(function () {
          sending = false;
          sendButton.disabled = false;
          input.disabled = false;
          input.focus();
        });
    });
  }
})();
