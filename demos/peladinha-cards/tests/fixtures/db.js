// Apenas interceptado pelo teste de browser; nunca importado pela aplicação real.
import { ATTRIBUTES } from "../../js/utils.js";
const now = {
  seconds: Math.floor(Date.now() / 1000),
  toDate: () => new Date(),
};
const base = {
  role: "member",
  country: "Portugal",
  countryCode: "PT",
  birthDate: "1998-05-20",
  heightCm: 178,
  weightKg: 76,
  preferredFoot: "right",
  primaryPosition: "ALA",
  secondaryPositions: ["MED"],
  shirtNumber: 10,
  photoURL: "",
  disabled: false,
  profileCompleted: true,
};
const seed = () => ({
  users: [
    {
      ...base,
      uid: "pedro",
      username: "pedro",
      displayName: "Pedro",
      role: "admin",
    },
    { ...base, uid: "joao", username: "joao", displayName: "João" },
  ],
  initialRatings: [
    {
      uid: "pedro",
      ratings20: Object.fromEntries(ATTRIBUTES.map(([k]) => [k, 16])),
      completed: true,
    },
  ],
  communityRatings: [],
  communitySummaries: [],
  gameSummaries: [],
  games: [],
  notifications: [],
  feedback: [],
  history: [],
});
const state = window.__testState || (window.__testState = seed());
export const users = async () => {
  if (window.__fail) throw Error("Firebase indisponível");
  return state.users;
};
export const games = async () => state.games;
export const initials = async () => state.initialRatings;
export const communitySummaries = async () => state.communitySummaries;
export const gameSummaries = async () => state.gameSummaries;
export const myCommunity = async (uid) =>
  state.communityRatings.filter((r) => r.raterId === uid);
export const myFeedback = async (gid, uid) =>
  state.feedback.filter((r) => r.gameId === gid && r.raterId === uid);
export const history = async () => state.history;
export const notifications = async () => state.notifications;
export const read = async (path) => {
  const [type, id] = path.split("/");
  return type === "initialRatings"
    ? state.initialRatings.find((r) => r.uid === id) || null
    : type === "communityRatings"
      ? state.communityRatings.find(
          (r) => `${r.raterId}_${r.targetId}` === id,
        ) || null
      : null;
};
export async function saveProfile(uid, data) {
  Object.assign(
    state.users.find((p) => p.uid === uid),
    data,
  );
}
export async function saveInitial(uid, ratings20) {
  let r = state.initialRatings.find((r) => r.uid === uid);
  if (!r) {
    r = { uid };
    state.initialRatings.push(r);
  }
  r.ratings20 = ratings20;
  r.completed = Object.keys(ratings20).length === 12;
}
export async function saveCommunity(raterId, targetId, ratings20, submit) {
  let r = state.communityRatings.find(
    (r) => r.raterId === raterId && r.targetId === targetId,
  );
  if (!r) {
    r = { raterId, targetId };
    state.communityRatings.push(r);
  }
  r.ratings20 = ratings20;
  r.submitted = !!submit;
}
export async function saveFeedback(gameId, raterId, targetId, ratings, submit) {
  let r = state.feedback.find(
    (r) =>
      r.gameId === gameId && r.raterId === raterId && r.targetId === targetId,
  );
  if (!r) {
    r = { gameId, raterId, targetId };
    state.feedback.push(r);
  }
  r.ratings = ratings;
  r.submitted = !!submit;
}
export async function saveGame(id, data, actor) {
  if (!id) {
    id = "test-game";
    state.games.push({ ...data, id, creatorId: actor.uid, closedAt: now });
  } else
    Object.assign(
      state.games.find((g) => g.id === id),
      data,
    );
  return id;
}
export async function uploadAvatar(uid, file) {
  return URL.createObjectURL(file);
}
export const markRead = async (uid, items) =>
  state.notifications.forEach((n) => {
    if (items.some((i) => i.id === n.id)) n.read = true;
  });
export const syncNotifications = async (uid, missions) => {
  for (const m of missions)
    if (!state.notifications.some((n) => n.id === m.id))
      state.notifications.push({
        id: m.id,
        title: m.title,
        body: m.description,
        href: m.href,
        read: false,
        createdAt: now,
      });
  return state.notifications;
};
export const callAdmin = async () => ({ data: { ok: true } });
export const list = async (path) =>
  path === "communityRatings"
    ? state.communityRatings
    : path.includes("/feedback")
      ? state.feedback
      : [];
export const watchLeague = () => () => {};
