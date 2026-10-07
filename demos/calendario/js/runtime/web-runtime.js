import { firebaseConfig, spaceId } from "../config.js";

const FIREBASE_VERSION = "12.15.0";
const FIREBASE_BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
const EMOJI_BASE = "https://cdn.jsdelivr.net/npm/emoji-picker-element@1.29.1";
const EMOJI_DATA_BASE = "https://cdn.jsdelivr.net/npm/emoji-picker-element-data@1.8.0";

export function createWebRuntime() {
  return {
    firebase: {
      config: firebaseConfig,
      spaceId,
      loadModules: async () => {
        const [app, auth, firestore] = await Promise.all([
          import(`${FIREBASE_BASE}/firebase-app.js`),
          import(`${FIREBASE_BASE}/firebase-auth.js`),
          import(`${FIREBASE_BASE}/firebase-firestore.js`)
        ]);
        return { app, auth, firestore };
      }
    },
    emoji: {
      dataSources: {
        pt: `${EMOJI_DATA_BASE}/pt/cldr/data.json`,
        en: `${EMOJI_DATA_BASE}/en/cldr/data.json`
      },
      loadDatabaseModule: () => import(`${EMOJI_BASE}/database.js`),
      loadPickerModule: () => import(`${EMOJI_BASE}/index.js`)
    }
  };
}
