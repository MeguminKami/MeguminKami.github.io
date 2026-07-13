import test from "node:test";
import assert from "node:assert/strict";
import { canComment, canEditComment, canModify } from "../js/core/permissions.js";
import { verifyAccessCode } from "../js/services/local-preferences.js";

test("aplica permissões informais a atividades individuais e de casal", () => {
  assert.equal(canModify({ creator: "joao", type: "joao" }, "joao"), true);
  assert.equal(canModify({ creator: "joao", type: "joao" }, "sofia"), false);
  assert.equal(canModify({ creator: "joao", type: "casal" }, "sofia"), true);
});

test("apenas o outro utilizador comenta e só o autor edita", () => {
  const empty = { creator: "joao", comment: null };
  assert.equal(canComment(empty, "sofia"), true);
  assert.equal(canComment(empty, "joao"), false);
  const commented = { creator: "joao", comment: { author: "sofia", text: "Boa!" } };
  assert.equal(canComment(commented, "sofia"), false);
  assert.equal(canEditComment(commented, "sofia"), true);
  assert.equal(canEditComment(commented, "joao"), false);
});

test("compara o código de acesso através da hash derivada", async () => {
  assert.equal(await verifyAccessCode("1005"), true);
  assert.equal(await verifyAccessCode("1004"), false);
});
