import test from "node:test";
import assert from "node:assert/strict";
import { createIOSPlatform, iosPlatformInternals } from "../src/ios-platform.js";

function dependencies(overrides = {}) {
  const calls = [];
  const removeCounts = { app: 0, network: 0 };
  let networkCallback;
  let appCallback;
  const values = {
    App: {
      async addListener(name, listener) {
        calls.push(["app-listener", name]); appCallback = listener;
        return { remove: async () => { removeCounts.app += 1; } };
      }
    },
    Browser: { async open(options) { calls.push(["browser", options]); } },
    Directory: { Cache: "CACHE" },
    Encoding: { UTF8: "utf8" },
    Filesystem: {
      async writeFile(options) { calls.push(["write", options]); },
      async getUri(options) { calls.push(["uri", options]); return { uri: "file:///cache/export.json" }; },
      async deleteFile(options) { calls.push(["delete", options]); }
    },
    NativePrint: {
      async printCurrentView(options) { calls.push(["print", options]); return { completed: true }; },
      async createPdf(options) { calls.push(["pdf", options]); return { uri: "file:///tmp/calendar.pdf" }; }
    },
    Network: {
      async getStatus() { calls.push(["network-status"]); return { connected: true }; },
      async addListener(name, listener) {
        calls.push(["network-listener", name]); networkCallback = listener;
        return { remove: async () => { removeCounts.network += 1; } };
      }
    },
    Share: { async share(options) { calls.push(["share", options]); return { activityType: "com.apple.UIKit.activity.CopyToPasteboard" }; } },
    initialOnline: false,
    ...overrides
  };
  return { values, calls, removeCounts, emitNetwork: (connected) => networkCallback?.({ connected }), emitApp: (isActive) => appCallback?.({ isActive }) };
}

test("exporta exatamente o conteúdo UTF-8, partilha e elimina a cache", async () => {
  const fixture = dependencies();
  const platform = createIOSPlatform(fixture.values);
  const result = await platform.exportFile({ content: "Olá, João\n", mimeType: "application/json", fileName: "dados.json" });
  assert.deepEqual(result, { status: "shared" });
  assert.deepEqual(fixture.calls, [
    ["write", { path: "exports/dados.json", data: "Olá, João\n", directory: "CACHE", encoding: "utf8", recursive: true }],
    ["uri", { path: "exports/dados.json", directory: "CACHE" }],
    ["share", { title: "Exportar dados.json", url: "file:///cache/export.json", dialogTitle: "Exportar dados.json" }],
    ["delete", { path: "exports/dados.json", directory: "CACHE" }]
  ]);
});

test("cancelar a partilha é silencioso e limpa o ficheiro", async () => {
  const fixture = dependencies({ Share: { async share() { return { activityType: "" }; } } });
  const platform = createIOSPlatform(fixture.values);
  assert.deepEqual(await platform.exportFile({ content: "x", mimeType: "text/plain", fileName: "dados.csv" }), { status: "cancelled" });
  assert.equal(fixture.calls.at(-1)[0], "delete");
});

test("um erro real de partilha é propagado depois da limpeza", async () => {
  const expected = new Error("share failed");
  const fixture = dependencies({ Share: { async share() { throw expected; } } });
  const platform = createIOSPlatform(fixture.values);
  await assert.rejects(() => platform.exportFile({ content: "x", mimeType: "text/plain", fileName: "dados.csv" }), expected);
  assert.equal(fixture.calls.at(-1)[0], "delete");
});

test("impressão e PDF distinguem conclusão de cancelamento", async () => {
  const fixture = dependencies();
  const platform = createIOSPlatform(fixture.values);
  assert.deepEqual(await platform.printCurrentView({ jobName: "Agenda" }), { completed: true });
  assert.deepEqual(await platform.sharePdf({ fileName: "agenda.pdf" }), { status: "shared" });
  assert.deepEqual(fixture.calls.slice(-3), [
    ["pdf", { fileName: "agenda.pdf" }],
    ["share", { title: "Partilhar calendário em PDF", url: "file:///tmp/calendar.pdf", dialogTitle: "Partilhar calendário em PDF" }],
    ["delete", { path: "file:///tmp/calendar.pdf" }]
  ]);

  const cancelledFixture = dependencies({
    NativePrint: {
      async printCurrentView() { return { completed: false }; },
      async createPdf() { return { uri: "file:///tmp/calendar.pdf" }; }
    },
    Share: { async share() { throw Object.assign(new Error("User cancelled"), { code: "ACTION_CANCELLED" }); } }
  });
  const cancelledPlatform = createIOSPlatform(cancelledFixture.values);
  assert.deepEqual(await cancelledPlatform.printCurrentView(), { completed: false });
  assert.deepEqual(await cancelledPlatform.sharePdf({ fileName: "agenda.pdf" }), { status: "cancelled" });
});

test("só abre URLs HTTP(S) e pede apresentação popover", async () => {
  const fixture = dependencies();
  const platform = createIOSPlatform(fixture.values);
  await platform.openExternalUrl("https://example.com/path?q=1");
  assert.deepEqual(fixture.calls.at(-1), ["browser", { url: "https://example.com/path?q=1", presentationStyle: "popover" }]);
  await assert.rejects(() => platform.openExternalUrl("javascript:alert(1)"), /HTTP ou HTTPS/u);
  await assert.rejects(() => platform.openExternalUrl("file:///etc/passwd"), /HTTP ou HTTPS/u);
});

test("rede e foreground usam uma subscrição por listener e removem-na uma vez", async () => {
  const fixture = dependencies();
  const platform = createIOSPlatform(fixture.values);
  const networkValues = [];
  const networkListener = (online) => networkValues.push(online);
  const removeNetworkA = await platform.onNetworkChange(networkListener);
  const removeNetworkB = await platform.onNetworkChange(networkListener);
  assert.equal(fixture.calls.filter(([name]) => name === "network-listener").length, 1);
  fixture.emitNetwork(true);
  assert.equal(platform.isOnline(), true);
  assert.deepEqual(networkValues, [true]);
  removeNetworkA(); removeNetworkB();
  await Promise.resolve();
  assert.equal(fixture.removeCounts.network, 1);

  let foregrounds = 0;
  const removeForeground = await platform.onForeground(() => { foregrounds += 1; });
  fixture.emitApp(false); fixture.emitApp(true);
  assert.equal(foregrounds, 1);
  removeForeground();
  await Promise.resolve();
  assert.equal(fixture.removeCounts.app, 1);
  assert.equal(await platform.refreshNetwork(), true);
});

test("rejeita nomes de ficheiro com travessia ou separadores", () => {
  for (const value of ["", ".", "..", "../dados.json", "pasta/dados.json", "pasta\\dados.json", "C:segredo"]) {
    assert.throws(() => iosPlatformInternals.safeFileName(value), /seguro/u);
  }
  assert.equal(iosPlatformInternals.safeFileName("o-que-vais-fazer-2026-07-14.ics"), "o-que-vais-fazer-2026-07-14.ics");
});
