import { mkdir, readFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { build } from "esbuild";
import { auditWww, localizeRuntimeDefaults, prepareIndex, WEB_ALLOWLIST } from "./build-helpers.mjs";
import { appRoot, copy, projectRoot, removeGenerated, requirePath, writeText, wwwRoot } from "./lib.mjs";

const emojiSources = {
  pt: join(appRoot, "node_modules", "emoji-picker-element-data", "pt", "cldr", "data.json"),
  en: join(appRoot, "node_modules", "emoji-picker-element-data", "en", "cldr", "data.json")
};

await removeGenerated(wwwRoot);
await mkdir(wwwRoot, { recursive: true });

for (const relativePath of WEB_ALLOWLIST) {
  const source = await requirePath(join(projectRoot, relativePath), `Falta o recurso partilhado ${relativePath}.`);
  const destination = join(wwwRoot, relativePath);
  if (relativePath === "index.html") await writeText(destination, prepareIndex(await readFile(source, "utf8")));
  else await copy(source, destination);
}

for (const [locale, source] of Object.entries(emojiSources)) {
  await requirePath(source, `Faltam os dados locais de emoji ${locale}; executa npm ci em app/.`);
  await copy(source, join(wwwRoot, "data", "emoji", `${locale}.json`));
}

const outfile = join(wwwRoot, "js", "web.js");
await mkdir(dirname(outfile), { recursive: true });
await build({
  absWorkingDir: appRoot,
  entryPoints: ["./src/main.js"],
  outfile: "www/js/web.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["safari15.4"],
  treeShaking: true,
  minify: false,
  sourcemap: false,
  legalComments: "eof",
  charset: "utf8",
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "info"
});
await writeText(outfile, localizeRuntimeDefaults(await readFile(outfile, "utf8")));

const files = await auditWww(wwwRoot, projectRoot);
console.log(`Bundle local criado em ${basename(wwwRoot)}/ (${files.length} ficheiros).`);
