import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_EMOJIS, EMOJI_CATALOG, findShortcodeContext, replaceShortcode, searchEmoji } from "../js/core/emoji-shortcodes.js";

test("abre shortcode apenas em contexto de texto apropriado", () => {
  assert.deepEqual(findShortcodeContext("Vamos :", 7), { start: 6, end: 7, query: "", complete: false });
  assert.deepEqual(findShortcodeContext("Vamos :smi", 10), { start: 6, end: 10, query: "smi", complete: false });
  assert.equal(findShortcodeContext("https://site.pt", 15), null);
  assert.equal(findShortcodeContext("hora:30", 7), null);
});

test("deteta shortcode completo, pesquisa aliases e substitui", () => {
  const context = findShortcodeContext("Olá :smile:", 12);
  assert.equal(context.complete, true);
  assert.equal(searchEmoji(DEFAULT_EMOJIS, "smile")[0].emoji, "😊");
  assert.equal(searchEmoji(EMOJI_CATALOG, "coracao")[0].emoji, "❤️");
  assert.equal(searchEmoji(EMOJI_CATALOG, "pizza")[0].emoji, "🍕");
  assert.deepEqual(replaceShortcode("Olá :smile:", context, "😊"), { value: "Olá 😊", cursor: 6 });
});
