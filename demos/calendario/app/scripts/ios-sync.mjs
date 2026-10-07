import { join } from "node:path";
import { appRoot, executable, exists, iosRoot, run } from "./lib.mjs";
import { configureIOSProject } from "./ios-project.mjs";

if (!(await exists(iosRoot))) throw new Error("app/ios ainda não existe; executa npm run ios:create primeiro.");
await run(process.execPath, [join(appRoot, "scripts", "build.mjs")]);
await run(executable("npx"), ["cap", "sync", "ios"]);
await configureIOSProject();
await run(process.execPath, [join(appRoot, "scripts", "assets-ios.mjs")]);
console.log("Bundle, plugins SPM e personalizações iOS/iPadOS sincronizados.");
