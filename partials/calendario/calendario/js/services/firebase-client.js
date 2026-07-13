import { firebaseConfig, spaceId } from "../config.js";

const VERSION = "12.15.0";
const BASE = `https://www.gstatic.com/firebasejs/${VERSION}`;

export function hasFirebaseConfig() {
  return Boolean(firebaseConfig && ["apiKey", "authDomain", "projectId", "appId"].every((key) => firebaseConfig[key] && !String(firebaseConfig[key]).includes("SUBSTITUIR")));
}

export async function connectFirebase() {
  if (!hasFirebaseConfig()) return { configured: false, spaceId };
  const [appModule, authModule, firestoreModule] = await Promise.all([
    import(`${BASE}/firebase-app.js`),
    import(`${BASE}/firebase-auth.js`),
    import(`${BASE}/firebase-firestore.js`)
  ]);
  const app = appModule.getApps().length ? appModule.getApp() : appModule.initializeApp(firebaseConfig);
  const auth = authModule.getAuth(app);
  if (!auth.currentUser) await authModule.signInAnonymously(auth);
  const db = firestoreModule.getFirestore(app);
  return { configured: true, app, auth, db, spaceId, authModule, firestore: firestoreModule };
}
