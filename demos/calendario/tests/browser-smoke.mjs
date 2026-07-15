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
const browserProfile = join(tmpdir(), `oqvf-smoke-${process.pid}-${Date.now()}-${Math.floor(Math.random() * 100000)}`);
const browser = spawn(edge, ["--headless=new", "--no-sandbox", "--disable-gpu", "--disable-gpu-sandbox", "--disable-software-rasterizer", "--disable-features=SkiaGraphite", "--no-first-run", "--remote-allow-origins=*", "--window-size=1280,900", `--remote-debugging-port=${debugPort}`, `--user-data-dir=${browserProfile}`, `http://127.0.0.1:${webPort}/index.html`], { stdio: ["ignore", "ignore", "pipe"] });
let browserStderr = "";
browser.stderr.on("data", (chunk) => { browserStderr += chunk.toString(); });

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
let socket;
try {
  let target;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { target = (await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json()).find((item) => item.type === "page" && item.url.includes(`127.0.0.1:${webPort}`)); } catch { /* Browser ainda a arrancar. */ }
    if (target) break;
    await delay(150);
  }
  assert.ok(target, `O browser headless não abriu a página. Código: ${browser.exitCode ?? "em execução"}. ${browserStderr.slice(-800)}`);
  await delay(700);
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", () => reject(new Error(`Não foi possível ligar ao DevTools em ${target.webSocketDebuggerUrl}. Código: ${browser.exitCode ?? "em execução"}. ${browserStderr.slice(-800)}`)), { once: true });
  });
  let id = 0;
  const pending = new Map();
  const errors = [];
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) { pending.get(message.id).resolve(message); pending.delete(message.id); }
    if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
    if (message.method === "Log.entryAdded" && message.params.entry.level === "error") errors.push(message.params.entry.text);
  });
  socket.addEventListener("close", () => {
    const error = new Error(`O Edge encerrou a ligação DevTools. Código: ${browser.exitCode ?? "em execução"}. ${browserStderr.slice(-800)}`);
    pending.forEach(({ reject }) => reject(error)); pending.clear();
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const messageId = ++id;
    const timeout = setTimeout(() => { pending.delete(messageId); reject(new Error(`O Edge não respondeu a ${method} em 10 segundos.`)); }, 10000);
    pending.set(messageId, {
      resolve: (message) => { clearTimeout(timeout); resolve(message); },
      reject: (error) => { clearTimeout(timeout); reject(error); }
    });
    socket.send(JSON.stringify({ id: messageId, method, params }));
  });
  await send("Runtime.enable"); await send("Log.enable"); await send("Page.enable");
  const storageResult = await send("Runtime.evaluate", { expression: `localStorage.setItem("oqvf.access.v1","granted");localStorage.setItem("oqvf.user.v1","joao");location.origin`, returnByValue: true });
  assert.match(storageResult.result.result.value, /^http:\/\/127\.0\.0\.1:/);
  await send("Page.reload", { ignoreCache: true }); await delay(1400);
  const desktopResult = await send("Runtime.evaluate", { expression: `JSON.stringify({appVisible:!document.querySelector("#app-view").hidden,days:document.querySelectorAll(".day-column").length,headers:document.querySelectorAll(".day-header").length,slots:document.querySelectorAll(".slot-button").length,title:document.title})`, returnByValue: true });
  const desktop = JSON.parse(desktopResult.result.result.value);
  assert.deepEqual(desktop, { appVisible: true, days: 7, headers: 7, slots: 238, title: "O que vais fazer?" });
  const visualResult = await send("Runtime.evaluate", { expression: `(()=>{const today=document.querySelector('.day-header.today');const todayColumn=document.querySelector('.day-column.today');const labels=[...document.querySelectorAll('.time-label')];const body=document.querySelector('.calendar-body');const sample=document.createElement('button');sample.className='event-card joao compact';sample.style.cssText='top:0;left:0;width:40%;height:calc(2.9411764706% - 2px)';todayColumn.append(sample);const halfHourHeight=Math.round(sample.getBoundingClientRect().height);sample.remove();return JSON.stringify({motifs:document.querySelectorAll('.floating-motif').length,backgroundAnimations:document.querySelector('#background-art').getAnimations({subtree:true}).length,todayColumns:document.querySelectorAll('.day-column.today').length,todayBorder:getComputedStyle(today).borderTopWidth,todayColumnBackground:getComputedStyle(todayColumn).backgroundColor,todayColumnShadow:getComputedStyle(todayColumn).boxShadow,timeLabels:labels.length,timeRowHeights:[...new Set(labels.map(label=>Math.round(label.getBoundingClientRect().height)))],halfHourHeight,calendarGap:getComputedStyle(body).marginTop})})()`, returnByValue: true });
  const visual = JSON.parse(visualResult.result.result.value);
  assert.equal(visual.motifs, 18); assert.ok(visual.backgroundAnimations > 0); assert.equal(visual.todayColumns, 1); assert.equal(visual.todayBorder, "3px"); assert.equal(visual.todayColumnShadow, "none"); assert.equal(visual.timeLabels, 18); assert.deepEqual(visual.timeRowHeights, [18]); assert.ok(visual.halfHourHeight >= 12 && visual.halfHourHeight <= 18); assert.equal(visual.calendarGap, "0px");
  const gridGeometryResult = await send("Runtime.evaluate", { expression: `(()=>{const gutter=document.querySelector('#time-gutter');const body=document.querySelector('.calendar-body');const grid=document.querySelector('#days-grid');const column=document.querySelector('.day-column');const scroller=document.querySelector('#calendar-scroller');const inner=document.querySelector('.calendar-inner');const container=document.querySelector('.calendar-container');const slots=[...column.querySelectorAll('.slot-button')];const labels=[...gutter.querySelectorAll('.time-label')];const rect=element=>element.getBoundingClientRect();const hourHeight=parseFloat(getComputedStyle(scroller).getPropertyValue('--hour-height'));const edgeSpace=parseFloat(getComputedStyle(scroller).getPropertyValue('--calendar-edge-space'));const slotHeight=rect(slots[0]).height;return JSON.stringify({slotCount:slots.length,firstMinute:slots[0].dataset.minute,lastMinute:slots.at(-1).dataset.minute,hourHeight,edgeSpace,slotHeight,gutterTop:rect(gutter).top,bodyTop:rect(body).top,gutterBottom:rect(gutter).bottom,bodyBottom:rect(body).bottom,gridBottom:rect(grid).bottom,columnBottom:rect(column).bottom,innerBottom:rect(inner).bottom,scrollerBottom:rect(scroller).bottom,containerContentBottom:rect(container).bottom-parseFloat(getComputedStyle(container).borderBottomWidth),startLabelTop:rect(labels[0]).top,endLabelBottom:rect(labels.at(-1)).bottom})})()`, returnByValue: true });
  const gridGeometry = JSON.parse(gridGeometryResult.result.result.value);
  assert.equal(gridGeometry.slotCount, 34); assert.equal(gridGeometry.firstMinute, "420"); assert.equal(gridGeometry.lastMinute, "1410");
  assert.ok(Math.abs(gridGeometry.hourHeight - gridGeometry.slotHeight * 2) <= 0.5, JSON.stringify(gridGeometry));
  assert.ok(Math.abs(gridGeometry.gutterTop - gridGeometry.bodyTop - gridGeometry.edgeSpace) <= 0.5); assert.ok(Math.abs(gridGeometry.bodyBottom - gridGeometry.gutterBottom - gridGeometry.edgeSpace) <= 0.5);
  assert.ok(Math.abs(gridGeometry.gridBottom - gridGeometry.gutterBottom) <= 0.5); assert.ok(Math.abs(gridGeometry.columnBottom - gridGeometry.gutterBottom) <= 0.5);
  assert.ok(Math.abs(gridGeometry.innerBottom - gridGeometry.bodyBottom) <= 0.5); assert.ok(Math.abs(gridGeometry.scrollerBottom - gridGeometry.bodyBottom) <= 0.5); assert.ok(Math.abs(gridGeometry.containerContentBottom - gridGeometry.bodyBottom) <= 0.5);
  assert.ok(Math.abs(gridGeometry.startLabelTop - gridGeometry.gutterTop) <= 0.5); assert.ok(Math.abs(gridGeometry.endLabelBottom - gridGeometry.gutterBottom) <= 0.5);
  const todayFrameResult = await send("Runtime.evaluate", { expression: `(()=>{const frame=getComputedStyle(document.querySelector('.day-column.today'),'::before');return JSON.stringify({width:frame.borderLeftWidth,style:frame.borderLeftStyle,zIndex:frame.zIndex})})()`, returnByValue: true });
  assert.deepEqual(JSON.parse(todayFrameResult.result.result.value), { width: "3px", style: "solid", zIndex: "8" });
  const nowLineSettingResult = await send("Runtime.evaluate", { expression: `(()=>{document.querySelector('#settings-open').click();const select=document.querySelector('#now-line-scope');const line=document.querySelector('#now-line');const initial={value:select.value,todayOnly:line.classList.contains('today-only')};select.value='today';select.dispatchEvent(new Event('change',{bubbles:true}));const changed={value:select.value,stored:localStorage.getItem('oqvf.now-line-scope.v1'),todayOnly:line.classList.contains('today-only')};select.value='week';select.dispatchEvent(new Event('change',{bubbles:true}));const restored={stored:localStorage.getItem('oqvf.now-line-scope.v1'),todayOnly:line.classList.contains('today-only')};document.querySelector('#settings-dialog').close();return JSON.stringify({initial,changed,restored})})()`, returnByValue: true });
  const nowLineSetting = JSON.parse(nowLineSettingResult.result.result.value);
  assert.deepEqual(nowLineSetting, { initial: { value: "week", todayOnly: false }, changed: { value: "today", stored: "today", todayOnly: true }, restored: { stored: "week", todayOnly: false } });
  const clickedResult = await send("Runtime.evaluate", { expression: `(()=>{const slot=document.querySelector('.slot-button[data-minute="1410"]');slot.click();return JSON.stringify({date:slot.dataset.date,open:document.querySelector('#activity-dialog').open,startDate:document.querySelector('#activity-start-date').value,startMinute:document.querySelector('#activity-start-time').value,endDate:document.querySelector('#activity-end-date').value,endMinute:document.querySelector('#activity-end-time').value})})()`, returnByValue: true });
  const clicked = JSON.parse(clickedResult.result.result.value);
  assert.deepEqual(clicked, { date: clicked.date, open: true, startDate: clicked.date, startMinute: "1410", endDate: clicked.date, endMinute: "1440" });
  const timeOptionsResult = await send("Runtime.evaluate", { expression: `JSON.stringify({start:[...document.querySelector('#activity-start-time').options].map(option=>option.value),end:[...document.querySelector('#activity-end-time').options].map(option=>option.value)})`, returnByValue: true });
  const timeOptions = JSON.parse(timeOptionsResult.result.result.value); assert.ok(timeOptions.start.includes("450")); assert.ok(timeOptions.end.includes("510")); assert.equal(timeOptions.start.at(-1), "1410"); assert.equal(timeOptions.end.at(-1), "1440");
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
  const insertedResult = await send("Runtime.evaluate", { expression: `(()=>{const box=document.querySelector('#emoji-picker-popover');const fallback=box.querySelector('.emoji-fallback-button');const native=box.querySelector('emoji-picker.emoji-native-picker');if(fallback)fallback.click();else native?.dispatchEvent(new CustomEvent('emoji-click',{detail:{unicode:'🍕'}}));return JSON.stringify({value:document.querySelector('#activity-title').value,closed:box.hidden,expanded:document.querySelector('.emoji-open[data-emoji-target="activity-title"]').getAttribute('aria-expanded')})})()`, returnByValue: true });
  const inserted = JSON.parse(insertedResult.result.result.value);
  assert.match(inserted.value, /🍕/u); assert.equal(inserted.closed, true); assert.equal(inserted.expanded, "false");
  await send("Runtime.evaluate", { expression: `document.querySelector('.emoji-open[data-emoji-target="activity-title"]').click()` });
  let completePicker;
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const completeResult = await send("Runtime.evaluate", { expression: `(()=>{const picker=document.querySelector('emoji-picker.emoji-native-picker');return picker?JSON.stringify({catalogSize:Number(picker.dataset.catalogSize),connected:picker.isConnected,hasSearch:Boolean(picker.shadowRoot?.querySelector('input[type="search"]')),hasCategories:Boolean(picker.shadowRoot?.querySelector('[role="tablist"],nav'))}):''})()`, returnByValue: true });
    if (completeResult.result.result.value) { completePicker = JSON.parse(completeResult.result.result.value); break; }
    await delay(100);
  }
  assert.ok(completePicker?.connected, "O seletor completo de emojis não abriu.");
  assert.ok(completePicker.catalogSize >= 1000, `O catálogo completo só contém ${completePicker.catalogSize} emojis base.`);
  assert.equal(completePicker.hasSearch, true); assert.equal(completePicker.hasCategories, true);
  let renderedEmojiCount = 0;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const renderedResult = await send("Runtime.evaluate", { expression: `document.querySelector('emoji-picker.emoji-native-picker')?.shadowRoot?.querySelectorAll('.emoji').length||0`, returnByValue: true });
    renderedEmojiCount = renderedResult.result.result.value;
    if (renderedEmojiCount >= 20) break;
    await delay(100);
  }
  assert.ok(renderedEmojiCount >= 20, `A grelha completa só desenhou ${renderedEmojiCount} emojis.`);
  const completePickerCapture = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(join(tmpdir(), "oqvf-emoji-complete-smoke.png"), Buffer.from(completePickerCapture.result.data, "base64"));
  await send("Runtime.evaluate", { expression: `(()=>{const picker=document.querySelector('emoji-picker.emoji-native-picker');const search=picker.shadowRoot.querySelector('input[type="search"]');search.value='pizza';search.dispatchEvent(new Event('input',{bubbles:true}));return true})()` });
  await delay(250);
  const nativeClickResult = await send("Runtime.evaluate", { expression: `(()=>{const picker=document.querySelector('emoji-picker.emoji-native-picker');const buttons=[...picker.shadowRoot.querySelectorAll('.emoji')];const button=buttons.find(item=>item.textContent.includes('🍕')||item.getAttribute('aria-label')?.toLocaleLowerCase('pt-PT').includes('pizza'));button?.click();return JSON.stringify({found:Boolean(button),results:buttons.length})})()`, returnByValue: true });
  const nativeClick = JSON.parse(nativeClickResult.result.result.value); assert.equal(nativeClick.found, true); assert.ok(nativeClick.results >= 1);
  await delay(100);
  const nativeInsertResult = await send("Runtime.evaluate", { expression: `(()=>{const input=document.querySelector('#activity-title');return JSON.stringify({inserted:(input.value.match(/🍕/gu)||[]).length>=2,closed:document.querySelector('#emoji-picker-popover').hidden,expanded:document.querySelector('.emoji-open[data-emoji-target="activity-title"]').getAttribute('aria-expanded')})})()`, returnByValue: true });
  assert.deepEqual(JSON.parse(nativeInsertResult.result.result.value), { inserted: true, closed: true, expanded: "false" });
  await send("Runtime.evaluate", { expression: `document.querySelector('#activity-dialog').close()` });
  const resizeResult = await send("Runtime.evaluate", { expression: `(async()=>{const {DragResizeController}=await import('./js/ui/drag-resize.js');const host=document.createElement('div');host.style.cssText='position:fixed;left:24px;top:130px;width:180px;height:578px;z-index:9999';const column=document.createElement('div');column.className='day-column';column.dataset.dayIndex='0';column.style.cssText='position:relative;width:180px;height:578px';const grid=document.createElement('div');grid.append(column);host.append(grid);document.body.append(host);const card=document.createElement('button');card.className='event-card joao resizable';card.dataset.movable='true';card.dataset.renderId='resize-smoke';card.style.cssText='top:5.882352941%;left:0;width:100%;height:calc(5.882352941% - 2px)';for(const edge of ['start','end']){const handle=document.createElement('span');handle.className='resize-handle '+edge;handle.dataset.resize=edge;const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');icon.setAttribute('class','icon resize-icon');const use=document.createElementNS('http://www.w3.org/2000/svg','use');use.setAttribute('href','./assets/icons.svg#i-resize-vertical');icon.append(use);handle.append(icon);card.append(handle)}column.append(card);Object.defineProperty(card,'setPointerCapture',{value:()=>{}});const activity={schemaVersion:1,id:'resize-smoke',creator:'joao',type:'joao',title:'Teste',description:'',location:'',url:'',start:{date:'2026-07-14',minute:480},end:{date:'2026-07-14',minute:540},recurrence:null,status:'active',comment:null,version:1,lastEditedBy:'joao'};let committed=null;let announcement='';const calendar={grid,scroller:{scrollLeft:0},suppressClick:false,hideTooltip(){}};new DragResizeController(calendar,{getState:()=>({windowStart:'2026-07-14'}),getActivity:()=>activity,onCommit:(source,interval,mode)=>{committed={interval,mode}},announce:value=>{announcement=value}});const endHandle=card.querySelector('.resize-handle.end');const rect=card.getBoundingClientRect();const x=rect.left+rect.width/2;const y=rect.bottom;endHandle.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,cancelable:true,pointerId:91,pointerType:'mouse',button:0,buttons:1,clientX:x,clientY:y}));await new Promise(resolve=>setTimeout(resolve,170));const opacityDuring=getComputedStyle(endHandle).opacity;const cursorDuring=getComputedStyle(endHandle).cursor;document.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,cancelable:true,pointerId:91,pointerType:'mouse',button:0,buttons:1,clientX:x,clientY:y+17}));const previewHeight=Math.round(card.getBoundingClientRect().height);document.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,cancelable:true,pointerId:91,pointerType:'mouse',button:0,buttons:0,clientX:x,clientY:y+17}));const result={handles:card.querySelectorAll('.resize-handle').length,icons:card.querySelectorAll('.resize-icon').length,cursor:cursorDuring,opacityDuring,previewHeight,endDate:committed?.interval.end.date,endMinute:committed?.interval.end.minute,mode:committed?.mode,pending:card.classList.contains('resize-pending'),announcement};host.remove();return JSON.stringify(result)})()`, awaitPromise: true, returnByValue: true });
  const resize = JSON.parse(resizeResult.result.result.value);
  assert.equal(resize.handles, 2); assert.equal(resize.icons, 2); assert.equal(resize.cursor, "ns-resize"); assert.ok(resize.previewHeight >= 48 && resize.previewHeight <= 51); assert.equal(resize.endDate, "2026-07-14"); assert.equal(resize.endMinute, 570); assert.equal(resize.mode, "end"); assert.equal(resize.pending, true); assert.equal(resize.announcement, "A guardar o novo horário.");
  const handleStyleResult = await send("Runtime.evaluate", { expression: `(()=>{const card=document.createElement('button');card.className='event-card joao resizable';card.style.cssText='position:fixed;left:20px;top:100px;width:160px;height:40px';for(const edge of ['start','end']){const handle=document.createElement('span');handle.className='resize-handle '+edge;card.append(handle)}document.body.append(card);const start=getComputedStyle(card.querySelector('.start'));const end=getComputedStyle(card.querySelector('.end'));const result={startOpacity:Number(start.opacity),endOpacity:Number(end.opacity),startZ:Number(start.zIndex),endZ:Number(end.zIndex)};card.remove();return JSON.stringify(result)})()`, returnByValue: true });
  const handleStyle = JSON.parse(handleStyleResult.result.result.value); assert.equal(handleStyle.startOpacity, 0); assert.equal(handleStyle.endOpacity, 0); assert.ok(handleStyle.startZ > handleStyle.endZ);
  const yearOpenResult = await send("Runtime.evaluate", { expression: `(()=>{document.querySelector('#year-view-open').click();const dialog=document.querySelector('#year-view-dialog');return JSON.stringify({open:dialog.open,months:dialog.querySelectorAll('.year-month').length,inMonth:dialog.querySelectorAll('.year-day.in-month').length,outside:dialog.querySelectorAll('.year-day.outside').length,today:dialog.querySelectorAll('.year-day.today').length,year:document.querySelector('#year-view-year').textContent})})()`, returnByValue: true });
  const yearOpen = JSON.parse(yearOpenResult.result.result.value); assert.equal(yearOpen.open, true); assert.equal(yearOpen.months, 12); assert.ok([365, 366].includes(yearOpen.inMonth)); assert.ok(yearOpen.outside > 0); assert.equal(yearOpen.today, 1);
  const yearCapture = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(join(tmpdir(), "oqvf-year-view-smoke.png"), Buffer.from(yearCapture.result.data, "base64"));
  const yearSelectResult = await send("Runtime.evaluate", { expression: `(()=>{const dialog=document.querySelector('#year-view-dialog');const target=[...dialog.querySelectorAll('.year-day.in-month')].find(button=>button.dataset.date.endsWith('-08-15'))||dialog.querySelector('.year-day.in-month');const expected=target.dataset.date;target.click();return JSON.stringify({expected,firstDay:document.querySelector('.day-column').dataset.date,closed:!dialog.open})})()`, returnByValue: true });
  const yearSelect = JSON.parse(yearSelectResult.result.result.value); assert.deepEqual(yearSelect, { expected: yearSelect.expected, firstDay: yearSelect.expected, closed: true });
  await send("Runtime.evaluate", { expression: `document.querySelector('[data-nav="today"]').click()` });
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
  await send("Runtime.evaluate", { expression: `(()=>{document.querySelector('#settings-open').click();document.querySelector('#mobile-preview-open').click();return true})()`, returnByValue: true });
  await delay(1400);
  const previewResult = await send("Runtime.evaluate", { expression: `(()=>{const dialog=document.querySelector('#mobile-preview-dialog');const frame=document.querySelector('#mobile-preview-frame');const doc=frame.contentDocument;return JSON.stringify({open:dialog.open,width:frame.contentWindow?.innerWidth,height:frame.contentWindow?.innerHeight,embedded:doc?.documentElement.classList.contains('mobile-preview-embedded'),days:doc?.querySelectorAll('.day-column').length,fab:doc?getComputedStyle(doc.querySelector('#add-activity-mobile')).display:null})})()`, returnByValue: true });
  const preview = JSON.parse(previewResult.result.result.value);
  assert.deepEqual(preview, { open: true, width: 390, height: 844, embedded: true, days: 7, fab: "flex" });
  const previewCapture = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(join(tmpdir(), "oqvf-mobile-preview-smoke.png"), Buffer.from(previewCapture.result.data, "base64"));
  await send("Runtime.evaluate", { expression: `document.querySelector('#mobile-preview-dialog').close()` });
  await send("Emulation.setDeviceMetricsOverride", { width: 320, height: 800, deviceScaleFactor: 1, mobile: true }); await delay(400);
  const mobileResult = await send("Runtime.evaluate", { expression: `(()=>{const button=document.querySelector("#add-activity-mobile");const add=button.getBoundingClientRect();const scroller=document.querySelector("#calendar-scroller");const timeWidth=document.querySelector("#time-gutter").getBoundingClientRect().width;const dayWidth=document.querySelector(".day-column").getBoundingClientRect().width;return JSON.stringify({viewport:document.documentElement.clientWidth,viewportHeight:innerHeight,calendarScrollable:document.querySelector(".calendar-inner").scrollWidth>scroller.clientWidth,scrollerWidth:Math.round(scroller.clientWidth),timeWidth:Math.round(timeWidth),dayWidth:Math.round(dayWidth),scrollbarWidth:getComputedStyle(scroller).scrollbarWidth,snapType:getComputedStyle(scroller).scrollSnapType,activeDay:[...document.querySelectorAll(".date-chip")].findIndex(chip=>chip.getAttribute("aria-current")==="date"),addTop:Math.round(add.top),addBottom:Math.round(add.bottom),addPosition:getComputedStyle(button).position})})()`, returnByValue: true });
  const mobile = JSON.parse(mobileResult.result.result.value);
  assert.equal(mobile.viewport, 320); assert.equal(mobile.calendarScrollable, true); assert.ok(Math.abs(mobile.dayWidth - (mobile.scrollerWidth - mobile.timeWidth)) <= 2);
  assert.equal(mobile.scrollbarWidth, "none"); assert.equal(mobile.snapType, "x mandatory"); assert.equal(mobile.activeDay, 0);
  assert.equal(mobile.addPosition, "fixed"); assert.ok(mobile.addBottom <= mobile.viewportHeight - 10 && mobile.addBottom >= mobile.viewportHeight - 30);
  await send("Runtime.evaluate", { expression: `(()=>{const scroller=document.querySelector('#calendar-scroller');const header=document.querySelectorAll('.day-header')[1];const timeWidth=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--time-width'))||0;scroller.scrollTo({left:Math.max(0,header.offsetLeft-timeWidth),behavior:'auto'});return true})()` });
  await delay(250);
  const swipedResult = await send("Runtime.evaluate", { expression: `(()=>{const chips=[...document.querySelectorAll('.date-chip')];return JSON.stringify({activeDay:chips.findIndex(chip=>chip.getAttribute('aria-current')==='date'),activeCount:chips.filter(chip=>chip.classList.contains('active')).length,scrollLeft:Math.round(document.querySelector('#calendar-scroller').scrollLeft),dayWidth:Math.round(document.querySelector('.day-column').getBoundingClientRect().width)})})()`, returnByValue: true });
  const swiped = JSON.parse(swipedResult.result.result.value);
  assert.equal(swiped.activeDay, 1); assert.equal(swiped.activeCount, 1); assert.ok(Math.abs(swiped.scrollLeft - swiped.dayWidth) <= 2);
  const mobileCapture = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(join(tmpdir(), "oqvf-calendar-mobile-smoke.png"), Buffer.from(mobileCapture.result.data, "base64"));
  assert.deepEqual(errors, []);
  console.log(`Smoke test OK (desktop e 320 px). Captura: ${screenshot}`);
  await send("Browser.close").catch(() => {});
} finally {
  socket?.close(); browser.kill(); server.close();
}
