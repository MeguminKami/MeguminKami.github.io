import { spawn } from "node:child_process";
import { access, copyFile, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const appRoot = resolve(fileURLToPath(new URL("../", import.meta.url)));
export const projectRoot = resolve(appRoot, "..");
export const wwwRoot = join(appRoot, "www");
export const iosRoot = join(appRoot, "ios");
export const nativeRoot = join(appRoot, "native", "ios");

export function inside(parent, candidate) {
  const value = relative(resolve(parent), resolve(candidate));
  return value === "" || (!value.startsWith(`..${sep}`) && value !== ".." && !isAbsolute(value));
}

export function assertInside(parent, candidate, label = "caminho") {
  if (!inside(parent, candidate)) throw new Error(`${label} fora da pasta permitida: ${candidate}`);
}

export async function exists(path) {
  try { await access(path, fsConstants.F_OK); return true; } catch { return false; }
}

export async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function writeText(path, content) {
  assertInside(appRoot, path, "destino de escrita");
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

export async function copy(source, destination) {
  assertInside(appRoot, destination, "destino da cópia");
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(source, destination);
}

export async function removeGenerated(path) {
  assertInside(appRoot, path, "artefacto gerado");
  if (![wwwRoot, join(appRoot, ".cache")].includes(resolve(path))) {
    throw new Error(`A limpeza recusou um caminho não autorizado: ${path}`);
  }
  await rm(path, { recursive: true, force: true });
}

export async function walkFiles(root) {
  if (!(await exists(root))) return [];
  const values = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) values.push(...await walkFiles(path));
    else if (entry.isFile()) values.push(path);
  }
  return values;
}

export async function size(path) {
  return (await stat(path)).size;
}

export function executable(name) {
  return process.platform === "win32" ? `${name}.cmd` : name;
}

export function run(command, args, { cwd = appRoot, env = process.env, capture = false } = {}) {
  return new Promise((resolvePromise, reject) => {
    const windowsCommandWrapper = process.platform === "win32" && /\.(?:cmd|bat)$/iu.test(command);
    const spawnCommand = windowsCommandWrapper ? (process.env.ComSpec || "cmd.exe") : command;
    const spawnArgs = windowsCommandWrapper ? ["/d", "/s", "/c", command, ...args] : args;
    const child = spawn(spawnCommand, spawnArgs, {
      cwd,
      env,
      shell: false,
      windowsHide: true,
      stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit"
    });
    let stdout = "";
    let stderr = "";
    if (capture) {
      child.stdout.on("data", (chunk) => { stdout += chunk; });
      child.stderr.on("data", (chunk) => { stderr += chunk; });
    }
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) resolvePromise({ stdout, stderr });
      else reject(new Error(`${command} terminou com código ${code ?? signal}.${stderr ? `\n${stderr.trim()}` : ""}`));
    });
  });
}

export async function requirePath(path, message) {
  if (!(await exists(path))) throw new Error(message || `Falta ${path}`);
  return path;
}
