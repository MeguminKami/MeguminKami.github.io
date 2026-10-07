import { join } from "node:path";
import { appRoot, executable, run } from "./lib.mjs";

await run(process.execPath, [join(appRoot, "scripts", "doctor.mjs")]);
await run(executable("npm"), ["test"]);
await run(executable("npm"), ["run", "test:root"]);
await run(process.execPath, [join(appRoot, "scripts", "build.mjs")]);
await run(process.execPath, [join(appRoot, "scripts", "smoke.mjs")]);
console.log("Verificação local concluída. A compilação Xcode continua a exigir um Mac.");
