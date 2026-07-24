(function () {
  "use strict";

  var script = document.currentScript;
  if (!script) return;

  var projectId = script.getAttribute("data-project-id");
  var scriptUrl;
  try {
    scriptUrl = new URL(script.src);
  } catch {
    return;
  }

  var apiBase =
    script.getAttribute("data-api-url") || scriptUrl.origin;

  if (!projectId || document.querySelector("[data-nuncius-widget]")) {
    if (!projectId) console.error("[Nuncius] data-project-id não informado.");
    return;
  }

  var storageKey = "nuncius:session:" + projectId;
  var sessionId = null;
  try {
    sessionId = localStorage.getItem(storageKey);
  } catch {
    // Some browsers block storage in third-party contexts. The in-memory
    // session still keeps the conversation coherent while this page is open.
  }
  if (!sessionId) {
    sessionId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString(36) + Math.random().toString(36).slice(2);
    try {
      localStorage.setItem(storageKey, sessionId);
    } catch {
      // Continue with the in-memory session when storage is unavailable.
    }
  }

  var host = document.createElement("div");
  host.setAttribute("data-nuncius-widget", projectId);
  var shadow = host.attachShadow({ mode: "open" });
  document.body.appendChild(host);

  var style = document.createElement("style");
  style.textContent = [
    ":host{all:initial;color-scheme:light}",
    "*,*::before,*::after{box-sizing:border-box}",
    ".nc-wrap{position:fixed;right:22px;bottom:22px;z-index:2147483647;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#172033}",
    ".nc-launcher{width:58px;height:58px;border:0;border-radius:18px;background:#6d46e8;color:#fff;display:grid;place-items:center;cursor:pointer;box-shadow:0 14px 38px rgba(70,43,158,.32);transition:transform .18s ease,background .18s ease}",
    ".nc-launcher:hover{transform:translateY(-2px);background:#5b35d5}.nc-launcher:focus-visible,.nc-send:focus-visible,.nc-close:focus-visible{outline:3px solid rgba(109,70,232,.28);outline-offset:3px}",
    ".nc-icon{width:25px;height:25px;display:block}",
    ".nc-panel{position:absolute;right:0;bottom:72px;width:min(380px,calc(100vw - 28px));height:min(600px,calc(100vh - 120px));min-height:420px;background:#fff;border:1px solid #e7e9ef;border-radius:22px;box-shadow:0 24px 70px rgba(30,22,60,.2);overflow:hidden;display:flex;flex-direction:column;opacity:0;visibility:hidden;transform:translateY(12px) scale(.98);transform-origin:bottom right;transition:opacity .18s ease,transform .18s ease,visibility .18s}",
    ".nc-panel.nc-open{opacity:1;visibility:visible;transform:translateY(0) scale(1)}",
    ".nc-header{height:78px;flex:0 0 auto;padding:16px 16px 16px 18px;background:linear-gradient(135deg,#7049e9,#5c37d4);color:#fff;display:flex;align-items:center;gap:12px}",
    ".nc-avatar{width:42px;height:42px;border-radius:13px;background:rgba(255,255,255,.18);display:grid;place-items:center}",
    ".nc-title{font-size:15px;font-weight:700;line-height:1.3}.nc-status{font-size:12px;opacity:.82;margin-top:3px;display:flex;align-items:center;gap:6px}.nc-dot{width:6px;height:6px;border-radius:50%;background:#6ee7b7}",
    ".nc-close{margin-left:auto;width:34px;height:34px;border:0;border-radius:9px;background:transparent;color:#fff;display:grid;place-items:center;cursor:pointer}.nc-close:hover{background:rgba(255,255,255,.13)}",
    ".nc-messages{flex:1;overflow-y:auto;padding:20px 16px;background:#f8f9fc;scroll-behavior:smooth}.nc-messages::-webkit-scrollbar{width:6px}.nc-messages::-webkit-scrollbar-thumb{background:#d8dbe5;border-radius:10px}",
    ".nc-row{display:flex;margin-bottom:12px}.nc-row.nc-user{justify-content:flex-end}",
    ".nc-bubble{max-width:82%;padding:11px 13px;border-radius:15px;font-size:13.5px;line-height:1.5;white-space:pre-wrap;word-break:break-word;background:#fff;color:#273044;border:1px solid #e9eaf0;border-bottom-left-radius:5px;box-shadow:0 1px 1px rgba(20,24,40,.02)}",
    ".nc-user .nc-bubble{background:#6d46e8;color:#fff;border-color:#6d46e8;border-bottom-left-radius:15px;border-bottom-right-radius:5px}",
    ".nc-time{font-size:10px;color:#9298a8;margin-top:5px;padding:0 4px}.nc-user .nc-time{text-align:right}",
    ".nc-compose{flex:0 0 auto;padding:12px;border-top:1px solid #e8eaf0;background:#fff;display:flex;align-items:flex-end;gap:8px}",
    ".nc-input{min-width:0;flex:1;resize:none;max-height:96px;height:42px;border:1px solid #dfe2ea;border-radius:13px;padding:10px 12px;font:13.5px/20px inherit;color:#20283a;background:#fff;outline:none}.nc-input:focus{border-color:#8f72ec;box-shadow:0 0 0 3px rgba(109,70,232,.1)}.nc-input::placeholder{color:#9aa0ae}",
    ".nc-send{width:42px;height:42px;flex:0 0 auto;border:0;border-radius:12px;background:#6d46e8;color:#fff;display:grid;place-items:center;cursor:pointer}.nc-send:hover{background:#5b35d5}.nc-send:disabled{opacity:.48;cursor:default}",
    ".nc-typing{display:inline-flex;gap:4px;align-items:center;height:18px}.nc-typing i{width:5px;height:5px;border-radius:50%;background:#9b91b9;animation:nc-pulse 1.2s infinite}.nc-typing i:nth-child(2){animation-delay:.15s}.nc-typing i:nth-child(3){animation-delay:.3s}",
    "@keyframes nc-pulse{0%,60%,100%{opacity:.35;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}",
    ".nc-powered{text-align:center;font-size:9px;color:#a0a5b2;background:#fff;padding:0 0 8px}",
    "@media(max-width:520px){.nc-wrap{right:14px;bottom:14px}.nc-panel{position:fixed;inset:12px 12px 84px;width:auto;height:auto;min-height:0;border-radius:19px}.nc-launcher{width:56px;height:56px}}",
    "@media(prefers-reduced-motion:reduce){.nc-panel,.nc-launcher{transition:none}.nc-typing i{animation:none}}",
  ].join("");

  var chatIcon =
    '<svg class="nc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/><path d="M8 9h8M8 13h5"/></svg>';
  var closeIcon =
    '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
  var sendIcon =
    '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>';

  var wrap = document.createElement("div");
  wrap.className = "nc-wrap";
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
    if (isOpen) window.setTimeout(function () { input.focus(); }, 100);
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

  form.addEventListener("submit", async function (event) {
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

    try {
      var response = await fetch(apiBase.replace(/\/$/, "") + "/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: projectId,
          sessionId: sessionId,
          message: message,
        }),
      });
      var data = await response.json().catch(function () {
        return {};
      });
      if (!response.ok) {
        throw new Error(data.error || "Não foi possível obter uma resposta.");
      }
      typing.remove();
      appendMessage(data.reply, "bot");
    } catch (error) {
      typing.remove();
      appendMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível enviar a mensagem. Tente novamente.",
        "bot",
      );
    } finally {
      sending = false;
      sendButton.disabled = false;
      input.disabled = false;
      input.focus();
    }
  });
})();
