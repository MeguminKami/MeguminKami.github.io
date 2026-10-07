import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { readFile, rm } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { appRoot, wwwRoot, run } from "./lib.mjs";

await run(process.execPath, [join(appRoot, "scripts", "build.mjs")]);

const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".json": "application/json; charset=utf-8" };
const server = createServer(async (request, response) => {
  try {
    const relative = normalize(decodeURIComponent(new URL(request.url, "http://local").pathname)).replace(/^[/\\]+/u, "") || "index.html";
    const file = resolve(wwwRoot, relative);
    if (file !== wwwRoot && !file.startsWith(`${wwwRoot}${sep}`)) throw new Error("path traversal");
    let body = await readFile(file);
    if (relative === "index.html") {
      body = Buffer.from(body.toString("utf8").replace("<head>", `<head><script>
        globalThis.__OQVF_TEST_MODE__ = true;
        localStorage.setItem("oqvf.access.v1", "granted");
        localStorage.setItem("oqvf.user.v1", "joao");
      </script>`));
    }
    response.writeHead(200, { "content-type": mime[extname(file)] || "application/octet-stream", "cache-control": "no-store" });
    if (request.method === "HEAD") response.end(); else response.end(body);
  } catch {
    response.writeHead(404); response.end("Not found");
  }
});

await new Promise((resolvePromise) => server.listen(0, "127.0.0.1", resolvePromise));
const port = server.address().port;
const origin = `http://127.0.0.1:${port}`;
const debugPort = 9900 + Math.floor(Math.random() * 80);
const profile = join(tmpdir(), `oqvf-app-smoke-${process.pid}-${Date.now()}`);

function browserExecutable() {
  if (process.env.OQVF_BROWSER) return process.env.OQVF_BROWSER;
  const candidates = process.platform === "win32"
    ? ["C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe", "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"]
    : process.platform === "darwin"
      ? ["/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
      : ["/usr/bin/microsoft-edge", "/usr/bin/google-chrome", "/usr/bin/chromium"];
  const found = candidates.find(existsSync);
  if (!found) throw new Error("Não encontrei Edge/Chrome. Define OQVF_BROWSER com o executável a usar.");
  return found;
}

const browser = spawn(browserExecutable(), [
  "--headless=new",
  "--no-sandbox",
  "--disable-gpu",
  "--no-first-run",
  "--remote-allow-origins=*",
  "--window-size=1280,900",
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profile}`,
  `${origin}/index.html`
], { stdio: ["ignore", "ignore", "pipe"] });
let stderr = "";
browser.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
const delay = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
let socket;

try {
  let target;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
      target = targets.find((entry) => entry.type === "page" && entry.url.startsWith(origin));
    } catch { /* Browser ainda a arrancar. */ }
    if (target) break;
    await delay(120);
  }
  assert.ok(target, `O browser não abriu o bundle. ${stderr.slice(-700)}`);
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolvePromise, reject) => {
    socket.addEventListener("open", resolvePromise, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  let messageId = 0;
  const pending = new Map();
  const errors = [];
  const requests = [];
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
    if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    if (message.method === "Log.entryAdded" && message.params.entry.level === "error") errors.push(message.params.entry.text);
    if (message.method === "Network.requestWillBeSent") requests.push(message.params.request.url);
  });
  const send = (method, params = {}) => new Promise((resolvePromise, reject) => {
    const id = ++messageId;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`DevTools não respondeu a ${method}.`)); }, 12000);
    pending.set(id, (message) => { clearTimeout(timeout); resolvePromise(message); });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const response = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (response.result.exceptionDetails) throw new Error(response.result.exceptionDetails.exception?.description || response.result.exceptionDetails.text);
    return response.result.result.value;
  };

  await send("Runtime.enable"); await send("Log.enable"); await send("Network.enable"); await send("Page.enable");
  requests.length = 0;
  errors.length = 0;
  await send("Page.reload", { ignoreCache: true });
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    ready = await evaluate(`Boolean(document.querySelector("#app-view") && !document.querySelector("#app-view").hidden && document.querySelectorAll(".day-column").length)`);
    if (ready) break;
    await delay(100);
  }
  assert.equal(ready, true, "A aplicação compilada não ficou pronta.");

  const initial = JSON.parse(await evaluate(`JSON.stringify({
    platform: document.documentElement.classList.contains("platform-ios"),
    visible: !document.querySelector("#app-view").hidden,
    days: document.querySelectorAll(".day-column").length,
    configured: !document.querySelector("#config-banner").hidden
  })`));
  assert.deepEqual(initial, { platform: true, visible: true, days: 7, configured: true });

  for (const viewport of [{ width: 320, height: 700 }, { width: 507, height: 768 }, { width: 768, height: 1024 }, { width: 1024, height: 768 }]) {
    await send("Emulation.setDeviceMetricsOverride", { ...viewport, deviceScaleFactor: 2, mobile: true });
    await delay(180);
    const layout = JSON.parse(await evaluate(`JSON.stringify({root:document.documentElement.scrollWidth,body:document.body.scrollWidth,viewport:innerWidth,dialogWidth:document.querySelector("#settings-dialog").getBoundingClientRect().width})`));
    assert.ok(layout.root <= layout.viewport + 1, `Scroll horizontal no viewport ${viewport.width}px: ${layout.root}px.`);
    assert.ok(layout.body <= layout.viewport + 1, `Body demasiado largo no viewport ${viewport.width}px: ${layout.body}px.`);
  }

  await send("Emulation.setDeviceMetricsOverride", { width: 768, height: 1024, deviceScaleFactor: 2, mobile: true });
  await evaluate(`document.querySelector(".slot-button")?.click(); document.querySelector('.emoji-open[data-emoji-target="activity-title"]')?.click(); true`);
  let picker;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    picker = await evaluate(`(()=>{const value=document.querySelector("emoji-picker.emoji-native-picker");return value?{size:Number(value.dataset.catalogSize),connected:value.isConnected}:null})()`);
    if (picker?.connected && picker.size >= 1000) break;
    await delay(100);
  }
  assert.ok(picker?.connected && picker.size >= 1000, `O picker local não carregou o catálogo completo (${picker?.size || 0}).`);

  await send("Emulation.setEmulatedMedia", { media: "print" });
  assert.equal(await evaluate(`getComputedStyle(document.querySelector(".app-header")).display`), "none");

  const external = requests.filter((url) => !url.startsWith(origin) && !url.startsWith("data:") && !url.startsWith("blob:") && !url.startsWith("devtools:"));
  assert.deepEqual(external, [], `Foram pedidos recursos externos: ${external.join(", ")}`);
  assert.deepEqual(errors, [], `Erros no bundle compilado: ${errors.join(" | ")}`);
  console.log("PASS: bundle local, layouts iPhone/iPad/Split View, emoji offline e impressão CSS.");
} finally {
  try { socket?.close(); } catch { /* Já encerrado. */ }
  if (browser.exitCode === null) {
    browser.kill();
    await Promise.race([
      new Promise((resolvePromise) => browser.once("exit", resolvePromise)),
      delay(2500)
    ]);
  }
  server.close();
  try { await rm(profile, { recursive: true, force: true, maxRetries: 6, retryDelay: 200 }); }
  catch (error) { console.warn(`Aviso: não foi possível remover imediatamente o perfil temporário: ${error.message}`); }
}
