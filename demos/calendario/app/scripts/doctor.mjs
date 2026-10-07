import { join } from "node:path";
import { appRoot, executable, exists, nativeRoot, readJson, run } from "./lib.mjs";

const failures = [];
const notes = [];
const major = Number(process.versions.node.split(".")[0]);
if (major < 22) failures.push(`Node ${process.versions.node}: é necessário Node 22 ou superior.`);
else notes.push(`Node ${process.versions.node}`);

const packageJson = await readJson(join(appRoot, "package.json"));
const config = await readJson(join(appRoot, "capacitor.config.json"));
if (config.webDir !== "www") failures.push("capacitor.config.json: webDir tem de ser www.");
if (config.server?.url || config.server?.allowNavigation) failures.push("A configuração não pode usar server.url nem allowNavigation.");
if (config.server?.hostname !== "localhost" || config.server?.iosScheme !== "capacitor") failures.push("A origem local tem de ser capacitor://localhost.");

const pinned = {
  "@capacitor/core": "8.4.1",
  "@capacitor/ios": "8.4.1",
  "@capacitor/cli": "8.4.1",
  firebase: "12.15.0",
  "emoji-picker-element": "1.29.1",
  "emoji-picker-element-data": "1.8.0"
};
for (const [name, version] of Object.entries(pinned)) {
  const actual = packageJson.dependencies?.[name] || packageJson.devDependencies?.[name];
  if (actual !== version) failures.push(`${name} tem de estar fixado em ${version}; encontrado ${actual || "em falta"}.`);
}

for (const relativePath of [
  "App/ViewController.swift",
  "App/NativePrintPlugin.swift",
  "App/PrivacyInfo.xcprivacy",
  "config/project-settings.json",
  "config/Info.plist.values.json",
  "assets/icon.svg",
  "assets/splash.svg"
]) {
  if (!(await exists(join(nativeRoot, relativePath)))) failures.push(`Falta o template nativo app/native/ios/${relativePath}.`);
}

if (!(await exists(join(appRoot, "package-lock.json")))) failures.push("Falta package-lock.json; executa npm install uma vez e versiona o lockfile.");
if (!(await exists(join(appRoot, "node_modules", "@capacitor", "cli", "package.json")))) failures.push("Dependências em falta; executa npm ci em app/.");

try {
  const { stdout } = await run(executable("npm"), ["--version"], { capture: true });
  notes.push(`npm ${stdout.trim()}`);
} catch (error) { failures.push(`npm indisponível: ${error.message}`); }

if (process.platform === "darwin") {
  try {
    const { stdout } = await run("xcodebuild", ["-version"], { capture: true });
    const xcodeMajor = Number(stdout.match(/Xcode\s+(\d+)/u)?.[1]);
    if (!Number.isFinite(xcodeMajor) || xcodeMajor < 26) failures.push(`É necessário Xcode 26 ou superior; encontrado ${stdout.trim().split("\n")[0] || "desconhecido"}.`);
    else notes.push(stdout.trim().replaceAll("\n", " · "));
  } catch { failures.push("Xcode não está disponível na linha de comandos (`xcode-select`)."); }
} else notes.push("Xcode: validação pendente num Mac (esperado neste sistema)");

for (const note of notes) console.log(`✓ ${note}`);
for (const failure of failures) console.error(`✗ ${failure}`);
if (failures.length) process.exitCode = 1;
else console.log("Ambiente pronto para build e sincronização iOS/iPadOS.");
