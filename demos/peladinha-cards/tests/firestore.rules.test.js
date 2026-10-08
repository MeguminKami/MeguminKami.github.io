import { readFileSync } from "node:fs";
import { test, before, after, beforeEach } from "node:test";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-peladinhas-rules",
    firestore: {
      host: "127.0.0.1",
      port: 8085,
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});
after(async () => env?.cleanup());
const user = (uid, role = "member") => ({
  uid,
  username: uid,
  displayName: uid,
  country: "Portugal",
  countryCode: "PT",
  photoURL: "",
  role,
  disabled: false,
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
});
const game = (status = "closed") => ({
  title: "Teste",
  location: "",
  notes: "",
  scheduledAt: Timestamp.now(),
  creatorId: "pedro",
  teamA: { starters: ["pedro"], bench: [] },
  teamB: { starters: ["joao"], bench: [] },
  score: { teamA: 8, teamB: 6 },
  status,
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
  closedAt: status === "closed" ? Timestamp.now() : null,
  closedBy: status === "closed" ? "pedro" : null,
});
const signed = (uid) =>
  env
    .authenticatedContext(uid, { email: `${uid}@auth.weeklyfc.app` })
    .firestore();
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (c) => {
    for (const uid of ["pedro", "joao", "outsider", "boss"])
      await setDoc(
        doc(c.firestore(), `users/${uid}`),
        user(uid, uid === "boss" ? "admin" : "member"),
      );
    await setDoc(doc(c.firestore(), "games/closed"), game());
    await setDoc(doc(c.firestore(), "games/open"), game("open"));
  });
});
test("tickets: leitura só do proprietário/admin e sem escrita directa", async () => {
  await env.withSecurityRulesDisabled(async (c) => {
    await setDoc(doc(c.firestore(), "tickets/support"), {
      title: "Ajuda",
      ownerId: "pedro",
      status: "closed",
    });
    await setDoc(doc(c.firestore(), "tickets/support/messages/one"), {
      authorId: "boss",
      body: "Resposta",
    });
  });
  for (const uid of ["pedro", "boss"]) {
    await assertSucceeds(getDoc(doc(signed(uid), "tickets/support")));
    await assertSucceeds(
      getDocs(collection(signed(uid), "tickets/support/messages")),
    );
    await assertFails(
      updateDoc(doc(signed(uid), "tickets/support"), { status: "open" }),
    );
    await assertFails(
      setDoc(doc(signed(uid), "tickets/support/messages/new"), {
        body: "Hack",
      }),
    );
  }
  await assertFails(getDoc(doc(signed("outsider"), "tickets/support")));
  await assertFails(
    getDocs(collection(signed("outsider"), "tickets/support/messages")),
  );
  await assertSucceeds(
    getDocs(
      query(
        collection(signed("pedro"), "tickets"),
        where("ownerId", "==", "pedro"),
      ),
    ),
  );
  await assertFails(getDocs(collection(signed("pedro"), "tickets")));
});
test("membro não promove role nem edita outro perfil", async () => {
  await assertFails(
    updateDoc(doc(signed("pedro"), "users/pedro"), {
      role: "admin",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(signed("pedro"), "users/joao"), {
      displayName: "Hack",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    updateDoc(doc(signed("pedro"), "users/pedro"), {
      displayName: "Pedro",
      heightCm: 178,
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(signed("pedro"), "users/pedro"), {
      heightCm: 999,
      updatedAt: serverTimestamp(),
    }),
  );
});
test("admin gere roles mas não remove o próprio acesso", async () => {
  await assertSucceeds(
    updateDoc(doc(signed("boss"), "users/joao"), {
      role: "admin",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(signed("boss"), "users/boss"), {
      role: "member",
      updatedAt: serverTimestamp(),
    }),
  );
});
const vote = (raterId = "pedro", targetId = "joao", submitted = true) => ({
  gameId: "closed",
  raterId,
  targetId,
  ratings: {
    overall: 4,
    attack: 4,
    passing: 4,
    defense: 4,
    physical: 4,
    goalkeeping: null,
  },
  submitted,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  submittedAt: submitted ? serverTimestamp() : null,
});
test("feedback só de participantes, sem autoavaliação, IDs únicos", async () => {
  await assertSucceeds(
    setDoc(doc(signed("pedro"), "games/closed/feedback/pedro_joao"), vote()),
  );
  await assertFails(
    setDoc(
      doc(signed("outsider"), "games/closed/feedback/outsider_joao"),
      vote("outsider"),
    ),
  );
  await assertFails(
    setDoc(
      doc(signed("pedro"), "games/closed/feedback/pedro_pedro"),
      vote("pedro", "pedro"),
    ),
  );
  await assertFails(
    setDoc(doc(signed("pedro"), "games/closed/feedback/duplicado"), vote()),
  );
});
test("rascunhos parciais e impossibilidade de alterar submissão", async () => {
  const v = vote("pedro", "joao", false);
  v.ratings = { overall: 4 };
  await assertSucceeds(
    setDoc(doc(signed("pedro"), "games/closed/feedback/pedro_joao"), v),
  );
  await assertSucceeds(
    updateDoc(doc(signed("pedro"), "games/closed/feedback/pedro_joao"), {
      ratings: vote().ratings,
      submitted: true,
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(signed("pedro"), "games/closed/feedback/pedro_joao"), {
      ratings: vote().ratings,
      updatedAt: serverTimestamp(),
    }),
  );
});
test("raw privados: query filtrada funciona, outra identidade não", async () => {
  await assertSucceeds(
    setDoc(doc(signed("pedro"), "games/closed/feedback/pedro_joao"), vote()),
  );
  await assertSucceeds(
    getDocs(
      query(
        collection(signed("pedro"), "games/closed/feedback"),
        where("raterId", "==", "pedro"),
      ),
    ),
  );
  await assertFails(
    getDoc(doc(signed("joao"), "games/closed/feedback/pedro_joao")),
  );
  await assertSucceeds(
    getDocs(collection(signed("boss"), "games/closed/feedback")),
  );
});
test("jogo fechado é imutável para criador; limites e duplicados", async () => {
  await assertFails(
    updateDoc(doc(signed("pedro"), "games/closed"), {
      title: "Outra",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    updateDoc(doc(signed("boss"), "games/closed"), {
      title: "Correcção",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(signed("pedro"), "games/open"), {
      teamB: { starters: ["pedro"], bench: [] },
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(signed("pedro"), "games/open"), {
      score: { teamA: -1, teamB: 0 },
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(signed("pedro"), "games/open"), {
      creatorId: "joao",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(
    updateDoc(doc(signed("pedro"), "games/open"), {
      status: "closed",
      closedAt: serverTimestamp(),
      closedBy: "pedro",
      updatedAt: serverTimestamp(),
    }),
  );
});
test("initial 0–20; agregados e snapshots não são manipuláveis", async () => {
  await assertSucceeds(
    setDoc(doc(signed("pedro"), "initialRatings/pedro"), {
      uid: "pedro",
      ratings20: { pace: 0 },
      completed: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(signed("pedro"), "initialRatings/pedro"), {
      ratings20: { pace: 21 },
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    setDoc(doc(signed("pedro"), "communitySummaries/pedro"), {
      count: 3,
      ratings20: { pace: 20 },
    }),
  );
  await assertFails(
    setDoc(doc(signed("pedro"), "users/pedro/cardHistory/2026-W41"), {
      ovr: 99,
    }),
  );
});
test("novo jogador: leitura de rascunho ausente e submissão única", async () => {
  await assertSucceeds(
    getDoc(doc(signed("pedro"), "communityRatings/pedro_joao")),
  );
  const r = {
    raterId: "pedro",
    targetId: "joao",
    ratings20: { pace: 14 },
    submitted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    submittedAt: null,
  };
  await assertSucceeds(
    setDoc(doc(signed("pedro"), "communityRatings/pedro_joao"), r),
  );
  await assertFails(getDoc(doc(signed("joao"), "communityRatings/pedro_joao")));
  await assertFails(
    setDoc(doc(signed("pedro"), "communityRatings/pedro_pedro"), {
      ...r,
      targetId: "pedro",
    }),
  );
  await assertFails(
    updateDoc(doc(signed("pedro"), "communityRatings/pedro_joao"), {
      submitted: true,
      submittedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  );
});
