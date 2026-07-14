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
    const body = await readFile(join(root, relative));
    response.writeHead(200, { "content-type": mime[extname(relative)] || "application/octet-stream" }); response.end(body);
  } catch { response.writeHead(404); response.end("Not found"); }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const webPort = server.address().port;
const edge = process.platform === "win32" ? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe" : "microsoft-edge";
const debugPort = 9633 + Math.floor(Math.random() * 250);
const browserProfile = join(tmpdir(), `oqvf-polish-${process.pid}-${Date.now()}`);
const browser = spawn(edge, ["--headless=new", "--no-sandbox", "--disable-gpu", "--no-first-run", "--remote-allow-origins=*", "--window-size=1280,900", `--remote-debugging-port=${debugPort}`, `--user-data-dir=${browserProfile}`, `http://127.0.0.1:${webPort}/index.html`], { stdio: ["ignore", "ignore", "pipe"] });
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
  assert.ok(target, `O browser headless não abriu a página. ${browserStderr.slice(-800)}`);
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  let id = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) { pending.get(message.id)(message); pending.delete(message.id); }
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const messageId = ++id;
    const timeout = setTimeout(() => { pending.delete(messageId); reject(new Error(`O Edge não respondeu a ${method}.`)); }, 10000);
    pending.set(messageId, (message) => { clearTimeout(timeout); resolve(message); });
    socket.send(JSON.stringify({ id: messageId, method, params }));
  });
  const evaluate = async (expression, awaitPromise = false) => {
    const result = await send("Runtime.evaluate", { expression, awaitPromise, returnByValue: true });
    if (result.result.exceptionDetails) throw new Error(result.result.exceptionDetails.exception?.description || result.result.exceptionDetails.text);
    return result.result.result.value;
  };

  await send("Runtime.enable"); await send("Page.enable");
  await evaluate(`localStorage.setItem("oqvf.access.v1","granted");localStorage.setItem("oqvf.user.v1","joao");true`);
  await send("Page.reload", { ignoreCache: true }); await delay(1300);

  const viewports = [
    { width: 1280, height: 900, expected: 7 },
    { width: 1050, height: 800, expected: 6 },
    { width: 900, height: 700, expected: 5 },
    { width: 760, height: 700, expected: 4 },
    { width: 430, height: 900, expected: 2 },
    { width: 390, height: 844, expected: 2 },
    { width: 320, height: 700, expected: 1 }
  ];

  for (const viewport of viewports) {
    await send("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.width <= 760 });
    await delay(220);
    const raw = await evaluate(`(()=>{const scroller=document.querySelector('#calendar-scroller');const strip=document.querySelector('#date-strip');const columns=[...document.querySelectorAll('.day-column')];const labels=[...document.querySelectorAll('.time-label')];const phases=[...document.querySelectorAll('.day-phase-icon')];const timeWidth=document.querySelector('#time-gutter').getBoundingClientRect().width;const dayWidth=columns[0].getBoundingClientRect().width;const count=Number(scroller.dataset.visibleDays);const usable=scroller.clientWidth-timeWidth;const stripStyle=getComputedStyle(strip);const chip=strip.querySelector('.date-chip');const chipWidth=chip?.getBoundingClientRect().width||0;const stripInner=strip.clientWidth-parseFloat(stripStyle.paddingLeft)-parseFloat(stripStyle.paddingRight);const gap=parseFloat(stripStyle.columnGap||stripStyle.gap||0);return JSON.stringify({count,dayWidth,usable,calendarWhole:Math.abs(dayWidth*count-usable)<=2,stripVisible:getComputedStyle(strip).display!=='none',stripWhole:count===7||Math.abs(chipWidth*count+gap*(count-1)-stripInner)<=2,scrollbar:getComputedStyle(scroller).scrollbarWidth,rootScrollbar:getComputedStyle(document.documentElement).scrollbarWidth,snap:getComputedStyle(scroller).scrollSnapType,slotHeight:labels[0].getBoundingClientRect().height,phaseCount:phases.length,timeColors:[...new Set(labels.map(label=>getComputedStyle(label).color))],todayFrame:getComputedStyle(document.querySelector('.day-column.today'),'::before').borderLeftWidth})})()`);
    const layout = JSON.parse(raw);
    assert.equal(layout.count, viewport.expected, `${viewport.width}px devia mostrar ${viewport.expected} dia(s).`);
    assert.equal(layout.calendarWhole, true); assert.equal(layout.stripWhole, true);
    assert.equal(layout.stripVisible, viewport.expected < 7);
    assert.equal(layout.scrollbar, "none"); assert.equal(layout.rootScrollbar, "none"); assert.equal(layout.snap, "x mandatory");
    assert.ok(layout.slotHeight >= 28 && layout.slotHeight <= 38);
    assert.equal(layout.phaseCount, 5); assert.equal(layout.timeColors.length, 1); assert.equal(layout.todayFrame, "3px");
  }

  await send("Emulation.setDeviceMetricsOverride", { width: 900, height: 700, deviceScaleFactor: 1, mobile: false }); await delay(220);
  await evaluate(`(()=>{const scroller=document.querySelector('#calendar-scroller');const width=document.querySelector('.day-column').getBoundingClientRect().width;scroller.scrollLeft=2*width;scroller.dispatchEvent(new Event('scroll'));return true})()`); await delay(80);
  await send("Emulation.setDeviceMetricsOverride", { width: 760, height: 700, deviceScaleFactor: 1, mobile: true }); await delay(250);
  const preserved = JSON.parse(await evaluate(`(()=>{const scroller=document.querySelector('#calendar-scroller');const width=document.querySelector('.day-column').getBoundingClientRect().width;const strip=document.querySelector('#date-strip');const stripStyle=getComputedStyle(strip);const left=strip.getBoundingClientRect().left+parseFloat(stripStyle.paddingLeft);const right=strip.getBoundingClientRect().right-parseFloat(stripStyle.paddingRight);const chips=[...strip.children];const intersecting=chips.filter(chip=>{const rect=chip.getBoundingClientRect();return rect.right>left&&rect.left<right});const partial=intersecting.filter(chip=>{const rect=chip.getBoundingClientRect();return rect.left<left-1||rect.right>right+1});return JSON.stringify({day:Math.round(scroller.scrollLeft/width),active:chips.findIndex(item=>item.classList.contains('active')),wholeChips:intersecting.length,partialChips:partial.length})})()`));
  assert.deepEqual(preserved, { day: 2, active: 2, wholeChips: 4, partialChips: 0 });

  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }); await delay(220);
  const preview = JSON.parse(await evaluate(`(async()=>{const date=document.querySelector('.day-column.today')?.dataset.date||document.querySelector('.day-column').dataset.date;const activity={schemaVersion:1,id:'polish-preview',creator:'joao',type:'joao',title:'Jantar especial',description:'Uma descrição longa e cuidada para confirmar que a prévia tem uma secção própria e permanece compacta mesmo com bastante texto.'.repeat(3),start:{date,minute:600},end:{date,minute:690},recurrence:null,status:'active',comment:{author:'sofia',text:'Comentário de teste com contexto suficiente para validar o cartão e o limite visual.'.repeat(2)},version:1,lastEditedBy:'joao'};const {CalendarView}=await import('./js/ui/calendar-view.js');const view=new CalendarView({onSlot(){},onEvent(){},canModify:()=>false});view.render({windowStart:date,activities:[activity],overrides:[],occurrences:[]});const card=document.querySelector('[data-render-id^="polish-preview"]');view.showTooltipFor(card,true);await new Promise(resolve=>setTimeout(resolve,40));const tip=document.querySelector('#tooltip');const rect=tip.getBoundingClientRect();const description=tip.querySelector('.tooltip-description p');const comment=tip.querySelector('.tooltip-comment p');const descriptionLine=parseFloat(getComputedStyle(description).lineHeight);const commentLine=parseFloat(getComputedStyle(comment).lineHeight);card.focus();await new Promise(resolve=>setTimeout(resolve,20));window.__polishView=view;return JSON.stringify({hidden:tip.hidden,title:tip.querySelector('.tooltip-header strong').textContent,description:Boolean(description),comment:Boolean(comment),descriptionLimited:description.clientHeight<=descriptionLine*4+1,commentLimited:comment.clientHeight<=commentLine*3+1,inViewport:rect.left>=0&&rect.top>=0&&rect.right<=innerWidth&&rect.bottom<=innerHeight,describedBy:card.getAttribute('aria-describedby')})})()`, true));
  assert.deepEqual(preview, { hidden: false, title: "Jantar especial", description: true, comment: true, descriptionLimited: true, commentLimited: true, inViewport: true, describedBy: "tooltip" });

  const details = JSON.parse(await evaluate(`(async()=>{const activity=window.__polishView.eventMap.values().next().value;const {ActivityDetails}=await import('./js/ui/activity-details.js');const details=new ActivityDetails({edit(){},cancel(){},remove(){},saveComment(){},removeComment(){}});details.open(activity,'sofia');const result={sections:document.querySelectorAll('#details-body .detail-section').length,description:Boolean(document.querySelector('#details-body .detail-description')),commentHeader:Boolean(document.querySelector('#details-body .comment-card-header')),commentMark:document.querySelector('#details-body .comment-author-mark')?.textContent};details.close();return JSON.stringify(result)})()`, true));
  assert.deepEqual(details, { sections: 2, description: true, commentHeader: true, commentMark: "S" });

  const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const screenshotPath = join(tmpdir(), "oqvf-calendar-polish-smoke.png");
  await writeFile(screenshotPath, Buffer.from(screenshot.result.data, "base64"));
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 }); await delay(220);
  const coarse = JSON.parse(await evaluate(`(async()=>{const view=window.__polishView;view.hideTooltip();const card=document.querySelector('[data-render-id^="polish-preview"]');view.showTooltipFor(card,false);await new Promise(resolve=>setTimeout(resolve,230));return JSON.stringify({coarse:matchMedia('(hover: none), (pointer: coarse)').matches,hidden:document.querySelector('#tooltip').hidden})})()`, true));
  assert.deepEqual(coarse, { coarse: true, hidden: true });
  const mobileScreenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const mobileScreenshotPath = join(tmpdir(), "oqvf-calendar-polish-mobile-smoke.png");
  await writeFile(mobileScreenshotPath, Buffer.from(mobileScreenshot.result.data, "base64"));
  await send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Emulation.setEmulatedMedia", { media: "print" }); await delay(120);
  const printLayout = JSON.parse(await evaluate(`(()=>{const scroller=document.querySelector('#calendar-scroller');const inner=document.querySelector('.calendar-inner');const headers=[...document.querySelectorAll('.day-header')];return JSON.stringify({fits:Math.abs(inner.getBoundingClientRect().width-scroller.clientWidth)<=2,headers:headers.length,equalWidths:new Set(headers.map(item=>Math.round(item.getBoundingClientRect().width))).size===1})})()`));
  assert.deepEqual(printLayout, { fits: true, headers: 7, equalWidths: true });
  console.log(`Polimento responsivo OK em 7 viewports. Capturas: ${screenshotPath} e ${mobileScreenshotPath}`);
  await send("Browser.close").catch(() => {});
} finally {
  socket?.close(); browser.kill(); server.close();
}
