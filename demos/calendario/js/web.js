import { startApplication } from "./app.js";
import { createWebPlatform } from "./platform/web-platform.js";
import { createWebRuntime } from "./runtime/web-runtime.js";

const overrides = globalThis.__OQVF_RUNTIME__;

startApplication({
  platform: overrides?.platform || createWebPlatform(),
  runtime: overrides?.runtime || createWebRuntime()
});
