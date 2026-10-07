import { extname, relative } from "node:path";
import { readFile } from "node:fs/promises";
import { walkFiles } from "./lib.mjs";

export const WEB_ALLOWLIST = Object.freeze([
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

export function prepareIndex(source) {
  let html = String(source);
  html = html.replace(/src=(["'])\.\/js\/app\.js\1/u, 'src="./js/web.js"');
  const entries = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/giu)].map((match) => match[1]);
  if (entries.length !== 1 || entries[0] !== "./js/web.js") {
    throw new Error("index.html tem de conter uma única entrada local ./js/web.js.");
  }
  if (/<(?:script|link)\b[^>]*(?:src|href)=["'](?:https?:)?\/\//iu.test(html)) {
    throw new Error("index.html contém código ou estilos remotos.");
  }
  return html;
}

export function localizeRuntimeDefaults(source) {
  const remoteEmojiData = "https://cdn.jsdelivr.net/npm/emoji-picker-element-data@^1/en/emojibase/data.json";
  const value = String(source);
  if (!value.includes(remoteEmojiData)) throw new Error("O bundle do emoji picker mudou e o dataSource predefinido precisa de nova revisão.");
  return value.replaceAll(remoteEmojiData, "./data/emoji/en.json");
}

export async function auditWww(wwwRoot, projectRoot) {
  const files = await walkFiles(wwwRoot);
  const names = files.map((file) => relative(wwwRoot, file).replaceAll("\\", "/")).sort();
  const required = [...WEB_ALLOWLIST, "data/emoji/en.json", "data/emoji/pt.json", "js/web.js"].sort();
  if (JSON.stringify(names) !== JSON.stringify(required)) {
    throw new Error(`Conteúdo inesperado em www.\nEsperado: ${required.join(", ")}\nObtido: ${names.join(", ")}`);
  }

  const sourceExtensions = new Set([".html", ".js", ".css"]);
  for (const file of files.filter((entry) => sourceExtensions.has(extname(entry)))) {
    const source = await readFile(file, "utf8");
    if (/\b(?:import|export)\s*(?:\(|[^;]*?\bfrom\s*)["'`](?:https?:)?\/\//u.test(source)) {
      throw new Error(`${relative(wwwRoot, file)} contém um import remoto.`);
    }
    if (source.includes(projectRoot) || /[A-Za-z]:\\Users\\/u.test(source)) {
      throw new Error(`${relative(wwwRoot, file)} contém um caminho absoluto da máquina de build.`);
    }
    if (/\bserver\s*:\s*\{[^}]*\burl\s*:/su.test(source)) {
      throw new Error(`${relative(wwwRoot, file)} contém server.url.`);
    }
    if (source.includes("www.gstatic.com/firebasejs") || source.includes("cdn.jsdelivr.net/npm/emoji-picker-element")) {
      throw new Error(`${relative(wwwRoot, file)} contém um endpoint CDN de runtime.`);
    }
    if (/https?:\/\/[^\s"'`]+\.js(?:[?#][^\s"'`]*)?/iu.test(source)) {
      throw new Error(`${relative(wwwRoot, file)} contém um URL de script remoto.`);
    }
  }
  return names;
}
