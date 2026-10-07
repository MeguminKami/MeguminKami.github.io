import { join } from "node:path";
import { mkdir, rm } from "node:fs/promises";
import { appRoot, assertInside, copy, executable, exists, iosRoot, nativeRoot, removeGenerated, run } from "./lib.mjs";

if (!(await exists(iosRoot))) throw new Error("app/ios ainda não existe; executa npm run ios:create primeiro.");
const staging = join(appRoot, ".cache", "capacitor-assets");
const stagingArgument = ".cache/capacitor-assets";
await removeGenerated(join(appRoot, ".cache"));
await mkdir(staging, { recursive: true });
await copy(join(nativeRoot, "assets", "icon.svg"), join(staging, "logo.svg"));
await run(executable("npx"), [
  "capacitor-assets", "generate", "--ios", "--assetPath", stagingArgument,
  "--iconBackgroundColor", "#fff8fa", "--iconBackgroundColorDark", "#fff8fa",
  "--splashBackgroundColor", "#fff8fa", "--splashBackgroundColorDark", "#fff8fa"
]);
for (const name of ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]) {
  const stale = join(iosRoot, "App", "App", "Assets.xcassets", "Splash.imageset", name);
  assertInside(iosRoot, stale, "splash Capacitor antigo");
  await rm(stale, { force: true });
}
console.log("Ícones e splash universais regenerados a partir dos SVG versionados.");
