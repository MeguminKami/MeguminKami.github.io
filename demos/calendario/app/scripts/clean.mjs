import { join } from "node:path";
import { appRoot, removeGenerated, wwwRoot } from "./lib.mjs";

await removeGenerated(wwwRoot);
await removeGenerated(join(appRoot, ".cache"));
console.log("Artefactos gerados removidos; app/ios foi preservado.");
