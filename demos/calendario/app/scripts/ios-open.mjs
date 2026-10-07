import { executable, exists, iosRoot, run } from "./lib.mjs";

if (!(await exists(iosRoot))) throw new Error("app/ios ainda não existe; executa npm run ios:create primeiro.");
await run(executable("npx"), ["cap", "open", "ios"]);
