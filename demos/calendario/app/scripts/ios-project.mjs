import { basename, join } from "node:path";
import { readFile } from "node:fs/promises";
import { appRoot, copy, iosRoot, nativeRoot, readJson, requirePath, writeText } from "./lib.mjs";

const generatedApp = join(iosRoot, "App", "App");
const projectFile = join(iosRoot, "App", "App.xcodeproj", "project.pbxproj");
const infoPlist = join(generatedApp, "Info.plist");
const mainStoryboard = join(generatedApp, "Base.lproj", "Main.storyboard");
const packageSwift = join(iosRoot, "App", "CapApp-SPM", "Package.swift");

function xmlEscape(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function plistValue(value) {
  if (typeof value === "boolean") return value ? "<true/>" : "<false/>";
  if (Array.isArray(value)) return `<array>\n${value.map((entry) => `\t\t<string>${xmlEscape(entry)}</string>`).join("\n")}\n\t</array>`;
  return `<string>${xmlEscape(value)}</string>`;
}

function setPlistValue(source, key, value) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const pattern = new RegExp(`(<key>${escaped}<\\/key>\\s*)(?:<true\\s*\\/>|<false\\s*\\/>|<string>[\\s\\S]*?<\\/string>|<array>[\\s\\S]*?<\\/array>)`, "u");
  const replacement = `$1${plistValue(value)}`;
  if (pattern.test(source)) return source.replace(pattern, replacement);
  const closing = source.lastIndexOf("</dict>");
  if (closing < 0) throw new Error("Info.plist não contém um dicionário raiz.");
  return `${source.slice(0, closing)}\t<key>${key}</key>\n\t${plistValue(value)}\n${source.slice(closing)}`;
}

function replaceBuildSetting(source, key, value) {
  const pattern = new RegExp(`(${key}\\s*=\\s*)[^;]+;`, "gu");
  if (!pattern.test(source)) throw new Error(`O projeto Xcode não contém a definição ${key}.`);
  return source.replace(pattern, `$1${value};`);
}

function normalizeSwiftPackagePaths(source) {
  return String(source).replace(
    /(path:\s*")([^"]+)(")/gu,
    (_, prefix, value, suffix) => `${prefix}${value.replaceAll("\\", "/")}${suffix}`
  );
}

function configureMainStoryboard(source, targetName = "App") {
  const customController = `customClass="ViewController" customModule="${xmlEscape(targetName)}" customModuleProvider="target"`;
  if (source.includes(customController)) return source;

  const capacitorController = /customClass="CAPBridgeViewController"\s+customModule="Capacitor"(?:\s+customModuleProvider="[^"]*")?/u;
  if (!capacitorController.test(source)) {
    throw new Error("Estrutura Xcode inesperada: Main.storyboard não contém o CAPBridgeViewController inicial.");
  }
  return source.replace(capacitorController, customController);
}

function insertBefore(source, marker, value) {
  if (!source.includes(marker)) throw new Error(`Estrutura Xcode inesperada: falta ${marker}.`);
  return source.replace(marker, `${value}${marker}`);
}

function addToAppGroup(source, fileReferenceId, name) {
  const pattern = /(\/\* App \*\/ = \{\s*isa = PBXGroup;\s*children = \()([\s\S]*?)(\);\s*path = App;)/u;
  if (!pattern.test(source)) throw new Error(`Não foi possível localizar o grupo App para adicionar ${name}.`);
  return source.replace(pattern, `$1$2\t\t\t\t${fileReferenceId} /* ${name} */,\n\t\t\t$3`);
}

function addToBuildPhase(source, phase, buildFileId, name) {
  const pattern = new RegExp(`(isa = ${phase};[\\s\\S]*?files = \\()([\\s\\S]*?)(\\);)`, "u");
  if (!pattern.test(source)) throw new Error(`Não foi possível localizar ${phase} para adicionar ${name}.`);
  return source.replace(pattern, `$1$2\t\t\t\t${buildFileId} /* ${name} in ${phase === "PBXSourcesBuildPhase" ? "Sources" : "Resources"} */,\n\t\t\t$3`);
}

function ensureTraditionalProjectFile(source, { name, fileType, fileReferenceId, buildFileId, phase }) {
  if (source.includes(`/* ${name} */`) || source.includes(`/* ${name} in `)) return source;
  const buildLabel = phase === "PBXSourcesBuildPhase" ? "Sources" : "Resources";
  source = insertBefore(source, "/* End PBXBuildFile section */", `\t\t${buildFileId} /* ${name} in ${buildLabel} */ = {isa = PBXBuildFile; fileRef = ${fileReferenceId} /* ${name} */; };\n`);
  source = insertBefore(source, "/* End PBXFileReference section */", `\t\t${fileReferenceId} /* ${name} */ = {isa = PBXFileReference; lastKnownFileType = ${fileType}; path = ${name}; sourceTree = \"<group>\"; };\n`);
  source = addToAppGroup(source, fileReferenceId, name);
  return addToBuildPhase(source, phase, buildFileId, name);
}

function configureProject(source, { appId, deploymentTarget, targetedDeviceFamily, supportsMacCatalyst }) {
  source = replaceBuildSetting(source, "PRODUCT_BUNDLE_IDENTIFIER", appId);
  source = replaceBuildSetting(source, "IPHONEOS_DEPLOYMENT_TARGET", deploymentTarget);
  source = replaceBuildSetting(source, "TARGETED_DEVICE_FAMILY", `\"${targetedDeviceFamily}\"`);
  if (/SUPPORTS_MACCATALYST\s*=/u.test(source)) source = replaceBuildSetting(source, "SUPPORTS_MACCATALYST", supportsMacCatalyst ? "YES" : "NO");

  if (!source.includes("PBXFileSystemSynchronizedRootGroup")) {
    source = ensureTraditionalProjectFile(source, {
      name: "ViewController.swift",
      fileType: "sourcecode.swift",
      fileReferenceId: "4F5156460000000000000005",
      buildFileId: "4F5156460000000000000006",
      phase: "PBXSourcesBuildPhase"
    });
    source = ensureTraditionalProjectFile(source, {
      name: "NativePrintPlugin.swift",
      fileType: "sourcecode.swift",
      fileReferenceId: "4F5156460000000000000001",
      buildFileId: "4F5156460000000000000002",
      phase: "PBXSourcesBuildPhase"
    });
    source = ensureTraditionalProjectFile(source, {
      name: "PrivacyInfo.xcprivacy",
      fileType: "text.xml",
      fileReferenceId: "4F5156460000000000000003",
      buildFileId: "4F5156460000000000000004",
      phase: "PBXResourcesBuildPhase"
    });
  }
  return source;
}

export async function configureIOSProject() {
  await requirePath(projectFile, "O projeto iOS ainda não existe; executa npm run ios:create.");
  await requirePath(infoPlist, "O projeto iOS gerado não contém App/App/Info.plist.");
  await requirePath(mainStoryboard, "O projeto iOS gerado não contém App/App/Base.lproj/Main.storyboard.");
  await requirePath(packageSwift, "O projeto iOS gerado não contém CapApp-SPM/Package.swift.");
  const capacitor = await readJson(join(appRoot, "capacitor.config.json"));
  const settings = await readJson(join(nativeRoot, "config", "project-settings.json"));
  const plistValues = await readJson(join(nativeRoot, "config", "Info.plist.values.json"));

  if (!capacitor.appId || !capacitor.appName) throw new Error("Define appId e appName em capacitor.config.json.");
  if (settings.targetName !== "App") throw new Error("Só é suportado o target Capacitor App.");

  for (const name of ["ViewController.swift", "NativePrintPlugin.swift", "PrivacyInfo.xcprivacy"]) {
    await copy(await requirePath(join(nativeRoot, "App", name)), join(generatedApp, name));
  }

  let plist = await readFile(infoPlist, "utf8");
  plist = setPlistValue(plist, "CFBundleDisplayName", capacitor.appName);
  for (const [key, value] of Object.entries(plistValues)) plist = setPlistValue(plist, key, value);
  await writeText(infoPlist, plist);

  const storyboard = configureMainStoryboard(await readFile(mainStoryboard, "utf8"), settings.targetName);
  await writeText(mainStoryboard, storyboard);

  let project = await readFile(projectFile, "utf8");
  project = configureProject(project, { appId: capacitor.appId, ...settings });
  await writeText(projectFile, project);

  const swiftPackage = normalizeSwiftPackagePaths(await readFile(packageSwift, "utf8"));
  await writeText(packageSwift, swiftPackage);

  console.log(`Projeto ${basename(iosRoot)} configurado: ${capacitor.appId}, iOS/iPadOS ${settings.deploymentTarget}, família ${settings.targetedDeviceFamily}.`);
}

export const iosProjectInternals = Object.freeze({
  configureMainStoryboard,
  configureProject,
  normalizeSwiftPackagePaths,
  setPlistValue
});
