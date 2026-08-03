import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import vm from "node:vm";

const widgetSource = fs.readFileSync(
  new URL("../public/widget.js", import.meta.url),
  "utf8",
);

function loadTestHooks() {
  const hooks = {};
  const context = {
    __NUNCIUS_TEST_HOOKS__: hooks,
    document: { currentScript: null },
  };
  context.globalThis = context;
  vm.runInNewContext(widgetSource, context);
  return hooks;
}

test("parses response links as button-ready message parts", () => {
  const { parseMessageParts } = loadTestHooks();
  const parts = parseMessageParts(
    "Arquivo pronto: [Baixar export.xlsx] (https://d.tmpfile.link/export.xlsx)",
  );

  assert.deepEqual(
    JSON.parse(JSON.stringify(parts)),
    [
      { type: "text", value: "Arquivo pronto: " },
      {
        type: "link",
        label: "Baixar export.xlsx",
        href: "https://d.tmpfile.link/export.xlsx",
      },
    ],
  );
});

test("keeps unsafe and non-link message content as plain text", () => {
  const { parseMessageParts } = loadTestHooks();
  const message = "[Executar](javascript:alert(1))";

  assert.deepEqual(JSON.parse(JSON.stringify(parseMessageParts(message))), [
    { type: "text", value: message },
  ]);
});

test("does not mount the widget when its configuration cannot be validated", async () => {
  const appendedNodes = [];
  const errors = [];
  const attributes = {
    "data-snippet-id": "9f7c8582-881d-4b96-9a9c-296461f6c982",
  };

  const context = {
    URL,
    console: {
      error: (...args) => errors.push(args),
    },
    document: {
      currentScript: {
        src: "https://widget.example/widget.js",
        getAttribute: (name) => attributes[name] ?? null,
      },
      querySelector: () => null,
      body: {
        appendChild: (node) => appendedNodes.push(node),
      },
    },
    fetch: () => Promise.reject(new TypeError("Failed to fetch")),
  };
  context.window = context;
  context.window.parent = context.window;

  vm.runInNewContext(widgetSource, context);
  await new Promise((resolve) => setImmediate(resolve));

  assert.equal(appendedNodes.length, 0);
  assert.equal(errors.length, 1);
});
