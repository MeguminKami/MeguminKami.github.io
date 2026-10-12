import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { resolve, relative, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(root, ".firebase/site");
if (relative(root, target) !== join(".firebase", "site"))
  throw Error("Destino inválido.");
// This directory is generated exclusively by this script.
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
for (const name of ["index.html", "js", "css", "assets"])
  cpSync(resolve(root, name), resolve(target, name), { recursive: true });
const forbidden =
  /^(functions|tests|scripts|node_modules|README\.md|package.*|firestore.*|storage.*|firebase.*)$/;
if (readdirSync(target).some((name) => forbidden.test(name)))
  throw Error("Ficheiro interno no site.");
const index = readFileSync(resolve(target, "index.html"), "utf8");
if (!index.includes("./js/app.js")) throw Error("Entrada do site inválida.");
console.log(
  "Frontend preparado em .firebase/site: apenas index.html, js, css e assets.",
);
