import { join } from "node:path";
import { appRoot, executable, run } from "./lib.mjs";

await run(process.execPath, [join(appRoot, "scripts", "ios-sync.mjs")]);
await run(executable("npx"), ["cap", "run", "ios"]);
