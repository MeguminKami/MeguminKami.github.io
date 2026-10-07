import test from "node:test";
import assert from "node:assert/strict";
import { localizeRuntimeDefaults, prepareIndex, WEB_ALLOWLIST } from "../scripts/build-helpers.mjs";

test("o allowlist contém apenas os recursos públicos necessários", () => {
  assert.deepEqual(WEB_ALLOWLIST, [
    "index.html",
    "assets/favicon.svg",
    "assets/icons.svg",
    "css/tokens.css",
    "css/base.css",
    "css/components.css",
    "css/calendar.css",
    "css/responsive.css",
    "css/print.css"
  ]);
});

test("prepareIndex aceita a entrada partilhada e migra a entrada antiga", () => {
  assert.match(prepareIndex('<script type="module" src="./js/web.js"></script>'), /\.\/js\/web\.js/u);
  assert.equal(
    prepareIndex('<script type="module" src="./js/app.js"></script>'),
    '<script type="module" src="./js/web.js"></script>'
  );
});

test("prepareIndex rejeita entradas múltiplas ou remotas", () => {
  assert.throws(() => prepareIndex('<script src="./js/web.js"></script><script src="./extra.js"></script>'), /única entrada/u);
  assert.throws(() => prepareIndex('<script src="https://example.com/app.js"></script>'), /única entrada|remoto/u);
  assert.throws(() => prepareIndex('<link rel="stylesheet" href="//example.com/a.css"><script src="./js/web.js"></script>'), /remoto/u);
});

test("substitui o dataSource CDN predefinido do picker por dados locais", () => {
  const remote = "https://cdn.jsdelivr.net/npm/emoji-picker-element-data@^1/en/emojibase/data.json";
  const result = localizeRuntimeDefaults(`const source = ${JSON.stringify(remote)};`);
  assert.doesNotMatch(result, /cdn\.jsdelivr\.net/u);
  assert.match(result, /\.\/data\/emoji\/en\.json/u);
});
