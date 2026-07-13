import { SCHEMA_VERSION } from "../core/constants.js";
import { validateActivity, validateProfile } from "../core/validation.js";

export class ConflictError extends Error {
  constructor(message = "A atividade foi alterada noutro dispositivo.") { super(message); this.name = "ConflictError"; }
}

export function createRepository(client) {
  if (!client?.configured) return null;
  const f = client.firestore;
  const root = f.doc(client.db, "spaces", client.spaceId);
  const settingsRef = f.doc(f.collection(root, "settings"), "general");
  const profilesRef = f.collection(root, "profiles");
  const activitiesRef = f.collection(root, "activities");
  const overridesRef = f.collection(root, "occurrenceOverrides");
  const validOverride = (value) => {
    if (!value || typeof value.seriesId !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value.occurrenceDate || "") || !value.replacement) return false;
    const candidate = { schemaVersion: SCHEMA_VERSION, creator: "joao", recurrence: null, comment: null, version: 1, lastEditedBy: "joao", ...value.replacement };
    return validateActivity(candidate).length === 0;
  };

  async function bootstrap() {
    const settings = await f.getDoc(settingsRef);
    if (!settings.exists()) await f.setDoc(settingsRef, { schemaVersion: SCHEMA_VERSION, name: "O que vais fazer?", timezone: "Europe/Lisbon", updatedAt: f.serverTimestamp() });
    for (const [id, displayName, palette] of [["joao", "João", "joao"], ["sofia", "Sofia", "sofia"]]) {
      const ref = f.doc(profilesRef, id);
      const snapshot = await f.getDoc(ref);
      if (!snapshot.exists()) await f.setDoc(ref, { schemaVersion: SCHEMA_VERSION, id, displayName, palette, avatar: null, version: 1, updatedAt: f.serverTimestamp() });
    }
  }

  function subscribe(update, onError) {
    const unsubscribers = [];
    const options = { includeMetadataChanges: true };
    const collectionHandler = (key, validator) => (snapshot) => {
      const values = [];
      let invalid = 0;
      for (const item of snapshot.docs) {
        const data = item.data();
        if (!validator || validator(data)) values.push({ id: item.id, ...data }); else invalid += 1;
      }
      update({ [key]: values, invalid, pending: snapshot.metadata.hasPendingWrites, fromCache: snapshot.metadata.fromCache });
    };
    unsubscribers.push(f.onSnapshot(activitiesRef, options, collectionHandler("activities", (value) => validateActivity(value, { remote: true }).length === 0), onError));
    unsubscribers.push(f.onSnapshot(overridesRef, options, collectionHandler("overrides", validOverride), onError));
    unsubscribers.push(f.onSnapshot(profilesRef, options, collectionHandler("profiles", validateProfile), onError));
    unsubscribers.push(f.onSnapshot(settingsRef, options, (snapshot) => update({ settings: snapshot.exists() ? snapshot.data() : null, pending: snapshot.metadata.hasPendingWrites, fromCache: snapshot.metadata.fromCache }), onError));
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }

  async function createActivity(activity) {
    const ref = f.doc(activitiesRef);
    await f.setDoc(ref, { ...activity, createdAt: f.serverTimestamp(), updatedAt: f.serverTimestamp() });
    return ref.id;
  }

  async function updateActivity(id, expectedVersion, changes, actor) {
    const ref = f.doc(activitiesRef, id);
    return f.runTransaction(client.db, async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists()) throw new ConflictError("A atividade já não existe.");
      const current = snapshot.data();
      if (current.version !== expectedVersion) throw new ConflictError();
      const next = { ...current, ...changes, version: current.version + 1, lastEditedBy: actor };
      const errors = validateActivity(next);
      if (errors.length) throw new Error(errors[0]);
      transaction.update(ref, { ...changes, version: current.version + 1, lastEditedBy: actor, updatedAt: f.serverTimestamp() });
      return current.version + 1;
    });
  }

  async function saveOverride(seriesId, occurrenceDate, replacement, actor) {
    const id = `${seriesId}_${occurrenceDate}`;
    const ref = f.doc(overridesRef, id);
    return f.runTransaction(client.db, async (transaction) => {
      const snapshot = await transaction.get(ref);
      const version = snapshot.exists() ? snapshot.data().version + 1 : 1;
      transaction.set(ref, { schemaVersion: SCHEMA_VERSION, seriesId, occurrenceDate, replacement, version, lastEditedBy: actor, createdAt: snapshot.exists() ? snapshot.data().createdAt : f.serverTimestamp(), updatedAt: f.serverTimestamp() });
      return version;
    });
  }

  async function clearOverrides(seriesId) {
    const snapshot = await f.getDocs(f.query(overridesRef, f.where("seriesId", "==", seriesId)));
    const batches = [];
    for (let i = 0; i < snapshot.docs.length; i += 450) {
      const batch = f.writeBatch(client.db);
      snapshot.docs.slice(i, i + 450).forEach((item) => batch.delete(item.ref));
      batches.push(batch.commit());
    }
    await Promise.all(batches);
  }

  async function removeActivity(id, expectedVersion) {
    const related = await f.getDocs(f.query(overridesRef, f.where("seriesId", "==", id)));
    const ref = f.doc(activitiesRef, id);
    await f.runTransaction(client.db, async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists() || snapshot.data().version !== expectedVersion) throw new ConflictError();
      transaction.delete(ref);
      related.docs.forEach((item) => transaction.delete(item.ref));
    });
  }

  async function saveProfile(profile, expectedVersion = 0) {
    const ref = f.doc(profilesRef, profile.id);
    await f.runTransaction(client.db, async (transaction) => {
      const snapshot = await transaction.get(ref);
      const currentVersion = snapshot.exists() ? snapshot.data().version : 0;
      if (expectedVersion && currentVersion !== expectedVersion) throw new ConflictError("O avatar mudou noutro dispositivo.");
      transaction.set(ref, { ...profile, schemaVersion: SCHEMA_VERSION, version: currentVersion + 1, updatedAt: f.serverTimestamp() }, { merge: true });
    });
  }

  return { bootstrap, subscribe, createActivity, updateActivity, saveOverride, clearOverrides, removeActivity, saveProfile };
}
