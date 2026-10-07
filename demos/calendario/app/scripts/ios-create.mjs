import { join } from "node:path";
import { appRoot, executable, exists, iosRoot, run } from "./lib.mjs";
import { configureIOSProject } from "./ios-project.mjs";

if (await exists(iosRoot)) throw new Error("app/ios já existe. A geração recusou substituí-lo; usa npm run sync:ios.");
await run(process.execPath, [join(appRoot, "scripts", "build.mjs")]);
try {
  await run(executable("npx"), ["cap", "add", "ios", "--packagemanager", "SPM"]);
} catch (error) {
  throw new Error(`${error.message}\nSe o Capacitor recusar a plataforma neste sistema, executa o mesmo comando num Mac; app/native/ios contém todas as personalizações determinísticas.`);
}
await configureIOSProject();
await run(process.execPath, [join(appRoot, "scripts", "assets-ios.mjs")]);
console.log("Projeto universal iPhone/iPad criado com Swift Package Manager.");
