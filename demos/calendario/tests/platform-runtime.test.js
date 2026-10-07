import test from "node:test";
import assert from "node:assert/strict";
import { connectFirebase, hasFirebaseConfig } from "../js/services/firebase-client.js";
import { createWebPlatform, safeExternalUrl } from "../js/platform/web-platform.js";

const validConfig = { apiKey: "key", authDomain: "example.test", projectId: "project", appId: "app" };

test("valida a configuração Firebase injetada sem carregar módulos quando está ausente", async () => {
  assert.equal(hasFirebaseConfig({ config: validConfig }), true);
  assert.equal(hasFirebaseConfig({ config: { ...validConfig, apiKey: "SUBSTITUIR" } }), false);
  let loaded = false;
  const result = await connectFirebase({ config: null, spaceId: "joao-sofia", loadModules: async () => { loaded = true; } });
  assert.deepEqual(result, { configured: false, spaceId: "joao-sofia" });
  assert.equal(loaded, false);
});

test("liga o Firebase através dos namespaces fornecidos pelo runtime", async () => {
  const initialized = [];
  const signedIn = [];
  const app = { name: "runtime-app" };
  const auth = { currentUser: null };
  const db = { name: "runtime-db" };
  const modules = {
    app: {
      getApps: () => [],
      getApp: () => app,
      initializeApp: (config) => { initialized.push(config); return app; }
    },
    auth: {
      getAuth: (received) => { assert.equal(received, app); return auth; },
      signInAnonymously: async (received) => { signedIn.push(received); received.currentUser = { uid: "anonymous" }; }
    },
    firestore: {
      getFirestore: (received) => { assert.equal(received, app); return db; }
    }
  };
  const client = await connectFirebase({ config: validConfig, spaceId: "joao-sofia", loadModules: async () => modules });
  assert.equal(client.configured, true);
  assert.equal(client.app, app);
  assert.equal(client.auth, auth);
  assert.equal(client.db, db);
  assert.equal(client.spaceId, "joao-sofia");
  assert.deepEqual(initialized, [validConfig]);
  assert.deepEqual(signedIn, [auth]);
});

test("a plataforma web gere rede, ficheiros, impressão e links seguros", async () => {
  const windowObject = new EventTarget();
  const documentObject = new EventTarget();
  const appended = [];
  const revoked = [];
  const opened = [];
  let clicked = 0;
  let printed = 0;
  windowObject.navigator = { onLine: true };
  windowObject.location = { href: "https://calendar.example/app" };
  windowObject.Blob = class { constructor(parts, options) { this.parts = parts; this.type = options.type; } };
  windowObject.URL = {
    createObjectURL: (blob) => { assert.equal(blob.parts[0], "conteúdo"); return "blob:test"; },
    revokeObjectURL: (url) => revoked.push(url)
  };
  windowObject.setTimeout = (callback) => { callback(); return 1; };
  windowObject.print = () => { printed += 1; };
  windowObject.open = (...args) => { opened.push(args); return { opener: "parent" }; };
  documentObject.visibilityState = "visible";
  documentObject.body = { append: (element) => appended.push(element) };
  documentObject.createElement = () => ({ hidden: false, click: () => { clicked += 1; }, remove() { this.removed = true; } });

  const platform = createWebPlatform({ window: windowObject, document: documentObject });
  const network = [];
  const removeNetwork = await platform.onNetworkChange((online) => network.push(online));
  windowObject.dispatchEvent(new Event("offline"));
  windowObject.dispatchEvent(new Event("online"));
  removeNetwork();
  windowObject.dispatchEvent(new Event("offline"));
  assert.deepEqual(network, [false, true]);

  const exported = await platform.exportFile({ content: "conteúdo", mimeType: "text/plain", fileName: "agenda.txt" });
  assert.deepEqual(exported, { status: "downloaded" });
  assert.equal(appended[0].download, "agenda.txt");
  assert.equal(appended[0].href, "blob:test");
  assert.equal(appended[0].removed, true);
  assert.equal(clicked, 1);
  assert.deepEqual(revoked, ["blob:test"]);

  assert.deepEqual(await platform.printCurrentView({ jobName: "Agenda" }), { completed: true });
  assert.equal(printed, 1);
  await platform.openExternalUrl("/ajuda");
  assert.deepEqual(opened[0], ["https://calendar.example/ajuda", "_blank", "noopener,noreferrer"]);
  await assert.rejects(() => platform.openExternalUrl("javascript:alert(1)"), /HTTP ou HTTPS/);
});

test("normaliza apenas endereços externos HTTP e HTTPS", () => {
  assert.equal(safeExternalUrl("https://example.com/path", "https://calendar.example"), "https://example.com/path");
  assert.equal(safeExternalUrl("/path", "https://calendar.example/app"), "https://calendar.example/path");
  assert.equal(safeExternalUrl("data:text/plain,teste", "https://calendar.example"), null);
  assert.equal(safeExternalUrl("não é um URL", undefined), null);
});
