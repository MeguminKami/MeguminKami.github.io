import { access } from "node:fs/promises";
import { join } from "node:path";

const RUNTIME_SCRIPT = String.raw`<script>
globalThis.__OQVF_RUNTIME__ = {
  runtime: {
    firebase: { config: null, spaceId: "smoke-test" },
    emoji: {
      dataSources: {
        pt: "/app/node_modules/emoji-picker-element-data/pt/cldr/data.json",
        en: "/app/node_modules/emoji-picker-element-data/en/cldr/data.json"
      },
      loadDatabaseModule: async () => ({ Database: (await import("/app/node_modules/emoji-picker-element/database.js")).default }),
      loadPickerModule: async () => {
        await new Promise((resolve) => setTimeout(resolve, 180));
        return { Picker: (await import("/app/node_modules/emoji-picker-element/picker.js")).default };
      }
    }
  }
};
</script>`;

export function injectBrowserTestRuntime(html) {
  const source = String(html);
  if (!source.includes("<head>")) throw new Error("O index de teste não contém <head>.");
  return source.replace("<head>", `<head>${RUNTIME_SCRIPT}`);
}

export async function assertBrowserTestRuntimeAvailable(root) {
  try {
    await access(join(root, "app", "node_modules", "emoji-picker-element", "picker.js"));
    await access(join(root, "app", "node_modules", "emoji-picker-element-data", "pt", "cldr", "data.json"));
  } catch {
    throw new Error("Faltam as dependências locais dos smokes. Executa `npm ci` dentro de app/.");
  }
}
