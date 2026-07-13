import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json" };
const server = createServer(async (request, response) => {
  try {
    const relative = normalize(decodeURIComponent(new URL(request.url, "http://local").pathname)).replace(/^[/\\]+/, "") || "index.html";
    const file = join(root, relative);
    const body = await readFile(file);
    response.writeHead(200, { "content-type": mime[extname(file)] || "application/octet-stream" }); response.end(body);
  } catch { response.writeHead(404); response.end("Not found"); }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const webPort = server.address().port;
const edge = process.platform === "win32" ? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" : "microsoft-edge";
const debugPort = 9333 + Math.floor(Math.random() * 300);
const browser = spawn(edge, ["--headless=new", "--disable-gpu", "--no-first-run", "--window-size=1280,900", `--remote-debugging-port=${debugPort}`, `--user-data-dir=${join(tmpdir(), `oqvf-smoke-${process.pid}`)}`, `http://127.0.0.1:${webPort}/index.html`], { stdio: "ignore" });

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
let socket;
try {
  let target;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { target = (await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json()).find((item) => item.type === "page" && item.url.includes(`127.0.0.1:${webPort}`)); } catch { /* Browser ainda a arrancar. */ }
    if (target) break;
    await delay(150);
  }
  assert.ok(target, "O browser headless não abriu a página.");
  await delay(700);
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  let id = 0;
  const pending = new Map();
  const errors = [];
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
    if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
    if (message.method === "Log.entryAdded" && message.params.entry.level === "error") errors.push(message.params.entry.text);
  });
  const send = (method, params = {}) => new Promise((resolve) => { const messageId = ++id; pending.set(messageId, resolve); socket.send(JSON.stringify({ id: messageId, method, params })); });
  await send("Runtime.enable"); await send("Log.enable"); await send("Page.enable");
  const storageResult = await send("Runtime.evaluate", { expression: `localStorage.setItem("oqvf.access.v1","granted");localStorage.setItem("oqvf.user.v1","joao");location.origin`, returnByValue: true });
  assert.match(storageResult.result.result.value, /^http:\/\/127\.0\.0\.1:/);
  await send("Page.reload", { ignoreCache: true }); await delay(1400);
  const desktopResult = await send("Runtime.evaluate", { expression: `JSON.stringify({appVisible:!document.querySelector("#app-view").hidden,days:document.querySelectorAll(".day-column").length,headers:document.querySelectorAll(".day-header").length,slots:document.querySelectorAll(".slot-button").length,title:document.title})`, returnByValue: true });
  const desktop = JSON.parse(desktopResult.result.result.value);
  assert.deepEqual(desktop, { appVisible: true, days: 7, headers: 7, slots: 119, title: "O que vais fazer?" });
  const visualResult = await send("Runtime.evaluate", { expression: `(()=>{const today=document.querySelector('.day-header.today');const labels=[...document.querySelectorAll('.time-label')];return JSON.stringify({motifs:document.querySelectorAll('.floating-motif').length,backgroundAnimations:document.querySelector('#background-art').getAnimations({subtree:true}).length,todayColumns:document.querySelectorAll('.day-column.today').length,todayBorder:getComputedStyle(today).borderTopWidth,timeLabels:labels.length,timeRowHeights:[...new Set(labels.map(label=>Math.round(label.getBoundingClientRect().height)))]})})()`, returnByValue: true });
  const visual = JSON.parse(visualResult.result.result.value);
  assert.equal(visual.motifs, 18); assert.ok(visual.backgroundAnimations > 0); assert.equal(visual.todayColumns, 1); assert.equal(visual.todayBorder, "4px"); assert.equal(visual.timeLabels, 17); assert.deepEqual(visual.timeRowHeights, [34]);
  const clickedResult = await send("Runtime.evaluate", { expression: `(()=>{const slot=document.querySelector('.slot-button[data-minute="600"]');slot.click();return JSON.stringify({date:slot.dataset.date,open:document.querySelector('#activity-dialog').open,startDate:document.querySelector('#activity-start-date').value,startMinute:document.querySelector('#activity-start-time').value,endDate:document.querySelector('#activity-end-date').value,endMinute:document.querySelector('#activity-end-time').value})})()`, returnByValue: true });
  const clicked = JSON.parse(clickedResult.result.result.value);
  assert.deepEqual(clicked, { date: clicked.date, open: true, startDate: clicked.date, startMinute: "600", endDate: clicked.date, endMinute: "660" });
  await send("Runtime.evaluate", { expression: `(()=>{const input=document.querySelector('#activity-title');input.value='Encontro :';input.setSelectionRange(input.value.length,input.value.length);input.dispatchEvent(new Event('input',{bubbles:true}));return true})()`, returnByValue: true });
  await delay(80);
  const emojiResult = await send("Runtime.evaluate", { expression: `(()=>{const suggestions=document.querySelector('#emoji-suggestions');const options=[...suggestions.querySelectorAll('.emoji-option')];const popoverOpen=suggestions.matches(':popover-open');options[0]?.click();return JSON.stringify({options:options.length,popoverOpen,value:document.querySelector('#activity-title').value,suggestionsHidden:suggestions.hidden})})()`, returnByValue: true });
  const emoji = JSON.parse(emojiResult.result.result.value);
  assert.equal(emoji.options, 7); assert.equal(emoji.popoverOpen, true); assert.notEqual(emoji.value, "Encontro :"); assert.equal(emoji.suggestionsHidden, true);
  await send("Runtime.evaluate", { expression: `document.querySelector('.emoji-open[data-emoji-target="activity-title"]').click()` });
  await delay(80);
  const pickerResult = await send("Runtime.evaluate", { expression: `(()=>{const picker=document.querySelector('#emoji-picker-popover');const search=picker.querySelector('.emoji-picker-search');const initial=picker.querySelectorAll('.emoji-fallback-button').length;const visible=!picker.hidden;const inline=Boolean(picker.closest('#activity-form'));search.value='pizza';search.dispatchEvent(new Event('input',{bubbles:true}));const results=[...picker.querySelectorAll('.emoji-fallback-button')];return JSON.stringify({visible,inline,initial,results:results.length,first:results[0]?.dataset.emoji})})()`, returnByValue: true });
  const picker = JSON.parse(pickerResult.result.result.value);
  assert.equal(picker.visible, true); assert.equal(picker.inline, true); assert.ok(picker.initial >= 60); assert.equal(picker.results, 1); assert.equal(picker.first, "🍕");
  const pickerCapture = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(join(tmpdir(), "oqvf-emoji-menu-smoke.png"), Buffer.from(pickerCapture.result.data, "base64"));
  const insertedResult = await send("Runtime.evaluate", { expression: `(()=>{const picker=document.querySelector('#emoji-picker-popover');picker.querySelector('.emoji-fallback-button')?.click();return JSON.stringify({value:document.querySelector('#activity-title').value,closed:picker.hidden,expanded:document.querySelector('.emoji-open[data-emoji-target="activity-title"]').getAttribute('aria-expanded')})})()`, returnByValue: true });
  const inserted = JSON.parse(insertedResult.result.result.value);
  assert.match(inserted.value, /🍕/u); assert.equal(inserted.closed, true); assert.equal(inserted.expanded, "false");
  await send("Runtime.evaluate", { expression: `document.querySelector('#activity-dialog').close()` });
  const menuResult = await send("Runtime.evaluate", { expression: `(async()=>{const original=document.querySelector('#activity-action-menu');original.id='activity-action-menu-app';const root=document.createElement('div');root.id='activity-action-menu';root.className='event-action-menu';root.hidden=true;document.body.append(root);const anchor=document.createElement('button');anchor.className='event-card joao';anchor.style.cssText='position:fixed;left:60px;top:250px;width:150px;height:40px';document.body.append(anchor);let action='';const {ActivityMenu}=await import('./js/ui/activity-menu.js');const menu=new ActivityMenu({details:()=>action='details',edit:()=>action='edit',cancel:()=>action='cancel',remove:()=>action='remove'});menu.open({title:'Teste',type:'joao',creator:'joao',status:'active',date:'2026-07-13',startMinute:600,endMinute:660},anchor,'joao');const actions=[...root.querySelectorAll('[data-action]')].map(button=>button.textContent.trim());const rect=root.getBoundingClientRect();root.querySelector('[data-action="cancel"]').click();await Promise.resolve();anchor.classList.add('cancelled');const cancelled=getComputedStyle(anchor);const result={actions,action,hidden:root.hidden,left:Math.round(rect.left),top:Math.round(rect.top),borderStyle:cancelled.borderStyle,filter:cancelled.filter};root.remove();anchor.remove();original.id='activity-action-menu';return JSON.stringify(result)})()`, awaitPromise: true, returnByValue: true });
  const menu = JSON.parse(menuResult.result.result.value);
  assert.deepEqual(menu.actions, ["Detalhes e comentário", "Editar", "Cancelar", "Apagar"]); assert.equal(menu.action, "cancel"); assert.equal(menu.hidden, true); assert.ok(menu.left >= 10 && menu.top >= 10); assert.equal(menu.borderStyle, "dashed"); assert.notEqual(menu.filter, "none");
  const taskRectResult = await send("Runtime.evaluate", { expression: `(()=>{const card=[...document.querySelectorAll('.event-card[data-movable="true"]')].find(item=>{const rect=item.getBoundingClientRect();return rect.bottom>0&&rect.top<innerHeight});if(!card)return null;const rect=card.getBoundingClientRect();return JSON.stringify({x:Math.round(rect.left+rect.width/2),y:Math.round(rect.top+Math.min(rect.height/2,12))})})()`, returnByValue: true });
  if (taskRectResult.result.result.value) {
    const taskRect = JSON.parse(taskRectResult.result.result.value);
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x: taskRect.x, y: taskRect.y, button: "left", clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: taskRect.x, y: taskRect.y, button: "left", clickCount: 1 });
    await delay(80);
    const taskMenuResult = await send("Runtime.evaluate", { expression: `(()=>{const actionMenu=document.querySelector('#activity-action-menu');return JSON.stringify({visible:!actionMenu.hidden,actions:[...actionMenu.querySelectorAll('[data-action]')].map(button=>button.textContent.trim())})})()`, returnByValue: true });
    const taskMenu = JSON.parse(taskMenuResult.result.result.value);
    assert.equal(taskMenu.visible, true); assert.ok(taskMenu.actions.includes("Editar")); assert.ok(taskMenu.actions.includes("Cancelar")); assert.ok(taskMenu.actions.includes("Apagar"));
    const taskMenuCapture = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await writeFile(join(tmpdir(), "oqvf-task-menu-smoke.png"), Buffer.from(taskMenuCapture.result.data, "base64"));
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape" });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape" });
  }
  const capture = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const screenshot = join(tmpdir(), "oqvf-calendar-smoke.png"); await writeFile(screenshot, Buffer.from(capture.result.data, "base64"));
  await send("Emulation.setDeviceMetricsOverride", { width: 320, height: 800, deviceScaleFactor: 1, mobile: true }); await delay(400);
  const mobileResult = await send("Runtime.evaluate", { expression: `(()=>{const button=document.querySelector("#add-activity-mobile");const add=button.getBoundingClientRect();return JSON.stringify({viewport:document.documentElement.clientWidth,viewportHeight:innerHeight,calendarScrollable:document.querySelector(".calendar-inner").scrollWidth>document.querySelector("#calendar-scroller").clientWidth,dayWidth:Math.round(document.querySelector(".day-column").getBoundingClientRect().width),addTop:Math.round(add.top),addBottom:Math.round(add.bottom),addPosition:getComputedStyle(button).position})})()`, returnByValue: true });
  const mobile = JSON.parse(mobileResult.result.result.value);
  assert.equal(mobile.viewport, 320); assert.equal(mobile.calendarScrollable, true); assert.ok(mobile.dayWidth >= 220);
  assert.equal(mobile.addPosition, "fixed"); assert.ok(mobile.addBottom <= mobile.viewportHeight - 10 && mobile.addBottom >= mobile.viewportHeight - 30);
  const mobileCapture = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(join(tmpdir(), "oqvf-calendar-mobile-smoke.png"), Buffer.from(mobileCapture.result.data, "base64"));
  assert.deepEqual(errors, []);
  console.log(`Smoke test OK (desktop e 320 px). Captura: ${screenshot}`);
  await send("Browser.close");
} finally {
  socket?.close(); browser.kill(); server.close();
}
