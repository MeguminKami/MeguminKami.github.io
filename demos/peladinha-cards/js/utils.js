export const ATTRIBUTES = [
  ["pace", "Velocidade", "VEL"],
  ["shooting", "Finalização", "FIN"],
  ["passing", "Passe", "PAS"],
  ["dribbling", "Drible", "DRI"],
  ["defending", "Defesa", "DEF"],
  ["physical", "Físico", "FIS"],
  ["goalkeeping", "Guarda-redes", "GR"],
  ["stamina", "Resistência", "RES"],
  ["vision", "Visão de jogo", "VIS"],
  ["positioning", "Posicionamento", "POS"],
  ["teamwork", "Jogo de equipa", "EQP"],
  ["composure", "Compostura", "COM"],
];
export const FEEDBACK = [
  ["overall", "Performance geral"],
  ["attack", "Ataque / Finalização"],
  ["passing", "Passe / Jogo colectivo"],
  ["defense", "Defesa"],
  ["physical", "Intensidade / Físico"],
  ["goalkeeping", "Guarda-redes"],
];
export const CARD_SETTINGS = {
  communityMinimum: 3,
  selfWeight: 0.2,
  communityWeight: 0.8,
  baselineWeight: 3,
};
export const COUNTRIES = [
  ["PT", "Portugal"],
  ["BR", "Brasil"],
  ["ES", "Espanha"],
  ["FR", "França"],
  ["GB", "Reino Unido"],
  ["AO", "Angola"],
  ["MZ", "Moçambique"],
  ["CV", "Cabo Verde"],
  ["DE", "Alemanha"],
  ["IT", "Itália"],
  ["NL", "Países Baixos"],
  ["BE", "Bélgica"],
  ["CH", "Suíça"],
  ["US", "Estados Unidos"],
  ["AR", "Argentina"],
];
export const THEMES = [
  "bronze-common",
  "bronze-rare",
  "silver-common",
  "silver-rare",
  "gold-common",
  "gold-rare",
  "in-form",
  "hot-streak",
  "playmaker",
  "sniper",
  "the-wall",
  "engine",
  "safe-hands",
  "perfect-five",
  "mvp",
  "legend-form",
];
const THEME_NAMES = {
  "bronze-common": "Bronze comum",
  "bronze-rare": "Bronze rara",
  "silver-common": "Prata comum",
  "silver-rare": "Prata rara",
  "gold-common": "Ouro comum",
  "gold-rare": "Ouro rara",
  "in-form": "Em forma",
  "hot-streak": "Série de ouro",
  playmaker: "Maestro",
  sniper: "Goleador",
  "the-wall": "A muralha",
  engine: "Motor da equipa",
  "safe-hands": "Mãos seguras",
  "perfect-five": "Cinco estrelas",
  mvp: "Melhor em campo",
  "legend-form": "Forma lendária",
  "custom-test": "Tema experimental",
};
export const themeName = (t) => THEME_NAMES[t] || "Carta personalizada";
export const average = (a) =>
  a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
export const clamp = (n, min, max) =>
  Math.min(max, Math.max(min, Number(n) || 0));
export const convert20To99 = (n) => Math.round((clamp(n, 0, 20) * 99) / 20);
export const convert5To99 = (n) => Math.round((clamp(n, 0, 5) * 99) / 5);
export const completeInitial = (r) =>
  ATTRIBUTES.every(([k]) => Number.isFinite(r?.[k]) && r[k] >= 0 && r[k] <= 20);
export const completeFeedback = (r) =>
  FEEDBACK.slice(0, 5).every(
    ([k]) => Number.isFinite(r?.[k]) && r[k] >= 0 && r[k] <= 5,
  ) &&
  (r.goalkeeping === null || Number.isFinite(r.goalkeeping));
export function calculateInitialBaseline(
  self,
  community,
  settings = CARD_SETTINGS,
) {
  return Object.fromEntries(
    ATTRIBUTES.map(([k]) => [
      k,
      community?.count >= 1
        ? (self?.[k] ?? community.ratings20[k]) * settings.selfWeight +
          community.ratings20[k] * settings.communityWeight
        : (self?.[k] ?? 0),
    ]),
  );
}
export function calculateGameAggregate(feedback) {
  return Object.fromEntries(
    FEEDBACK.map(([k]) => {
      const a = feedback
        .filter((f) => f.submitted)
        .map((f) => f.ratings[k])
        .filter(Number.isFinite);
      return [k, a.length ? average(a) : null];
    }),
  );
}
export function mapAggregateToStats(a) {
  const mapping = {
    pace: "physical",
    shooting: "attack",
    passing: "passing",
    dribbling: "attack",
    defending: "defense",
    physical: "physical",
    goalkeeping: "goalkeeping",
    stamina: "physical",
    vision: "passing",
    positioning: "defense",
    teamwork: "passing",
    composure: "attack",
  };
  return Object.fromEntries(
    ATTRIBUTES.map(([k]) => {
      const primary = a[mapping[k]];
      return [
        k,
        primary == null
          ? null
          : Math.round(
              convert5To99(primary) * 0.9 +
                convert5To99(a.overall ?? primary) * 0.1,
            ),
      ];
    }),
  );
}
export function calculatePlayerStats(initial, aggregates) {
  return Object.fromEntries(
    ATTRIBUTES.map(([k]) => {
      const v = aggregates
        .map(mapAggregateToStats)
        .map((x) => x[k])
        .filter(Number.isFinite);
      return [
        k,
        Math.round(
          (convert20To99(initial[k] ?? 0) * CARD_SETTINGS.baselineWeight +
            v.reduce((s, n) => s + n, 0)) /
            (CARD_SETTINGS.baselineWeight + v.length),
        ),
      ];
    }),
  );
}
export const calculateOverall = (stats) =>
  Math.round(average(ATTRIBUTES.map(([k]) => clamp(stats[k], 0, 99))));
export function calculateBaseCard(o) {
  return o < 50
    ? "bronze-common"
    : o < 65
      ? "bronze-rare"
      : o < 70
        ? "silver-common"
        : o < 75
          ? "silver-rare"
          : o < 85
            ? "gold-common"
            : "gold-rare";
}
export function calculateSpecialCards(games) {
  const g = games.filter((x) => Number.isFinite(x.overall));
  const last = (n) => g.slice(-n);
  const awards = [];
  const add = (id, extra = {}) =>
    awards.push({ id, name: themeName(id), ...extra });
  if (
    last(5).length === 5 &&
    average(last(5).map((x) => x.overall)) >= 4.5 &&
    last(5).every((x) => x.overall >= 4)
  )
    add("legend-form");
  const perfect = FEEDBACK.find(
    ([k]) => last(3).length === 3 && last(3).every((x) => x[k] === 5),
  );
  if (perfect) add("perfect-five", { attribute: perfect[1] });
  if (g.some((x) => x.mvp)) add("mvp");
  if (last(3).length === 3 && last(3).every((x) => x.overall >= 4.2))
    add("hot-streak");
  if (last(2).length === 2 && last(2).every((x) => x.overall >= 4))
    add("in-form");
  for (const [id, key] of [
    ["playmaker", "passing"],
    ["sniper", "attack"],
    ["the-wall", "defense"],
    ["engine", "physical"],
  ]) {
    const v = g.filter((x) => Number.isFinite(x[key])).slice(-3);
    if (v.length === 3 && average(v.map((x) => x[key])) >= 4.7) add(id);
  }
  if (
    g
      .filter((x) => Number.isFinite(x.goalkeeping))
      .slice(-3)
      .filter((x) => x.goalkeeping >= 4.7).length >= 2
  )
    add("safe-hands");
  return awards;
}
export const asDate = (value) =>
  value?.toDate?.() || (value ? new Date(value) : null);
export const participants = (g) => [
  ...(g.teamA?.starters || []),
  ...(g.teamA?.bench || []),
  ...(g.teamB?.starters || []),
  ...(g.teamB?.bench || []),
];
export function calculateMatchStats(uid, games) {
  const s = {
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
  };
  for (const g of games.filter(
    (x) => x.status === "closed" && participants(x).includes(uid),
  )) {
    const a = [...g.teamA.starters, ...g.teamA.bench].includes(uid);
    const f = g.score[a ? "teamA" : "teamB"],
      against = g.score[a ? "teamB" : "teamA"];
    s.played++;
    s.goalsFor += f;
    s.goalsAgainst += against;
    s[f > against ? "wins" : f === against ? "draws" : "losses"]++;
  }
  return {
    ...s,
    winRate: s.played ? Math.round((s.wins / s.played) * 100) : 0,
    goalDifference: s.goalsFor - s.goalsAgainst,
  };
}
export function isoWeek(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(asDate(date));
  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const d = new Date(Date.UTC(+v.year, +v.month - 1, +v.day));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  return `${d.getUTCFullYear()}-W${String(Math.ceil(((d - new Date(Date.UTC(d.getUTCFullYear(), 0, 1))) / 86400000 + 1) / 7)).padStart(2, "0")}`;
}
export function isoWeekEnd(weekId) {
  const [year, week] = weekId.split("-W").map(Number);
  const january4 = new Date(Date.UTC(year, 0, 4));
  const monday =
    Date.UTC(year, 0, 4) -
    ((january4.getUTCDay() + 6) % 7) * 86400000 +
    week * 7 * 86400000;
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Lisbon",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(monday))
      .map((p) => [p.type, p.value]),
  );
  const local = Date.UTC(
    +parts.year,
    +parts.month - 1,
    +parts.day,
    +parts.hour,
    +parts.minute,
    +parts.second,
  );
  return new Date(monday - (local - monday) - 1);
}
export function calculateWeeklyTopPlayers(players, date = new Date()) {
  const week = isoWeek(date);
  return players
    .map((p) => {
      const games = (p.aggregates || []).filter(
        (g) => isoWeek(g.date) === week && g.count >= 2,
      );
      return {
        ...p,
        weeklyPerformance: games.length
          ? average(games.map((g) => g.overall))
          : null,
      };
    })
    .sort(
      (a, b) =>
        (b.weeklyPerformance ?? -1) - (a.weeklyPerformance ?? -1) ||
        b.ovr - a.ovr ||
        (a.username || "").localeCompare(b.username || ""),
    );
}
export function profileComplete(p) {
  return !!(
    p?.displayName?.trim() &&
    p.countryCode &&
    /^\d{4}-\d{2}-\d{2}$/.test(p.birthDate || "") &&
    p.heightCm >= 120 &&
    p.heightCm <= 230 &&
    ["right", "left", "both"].includes(p.preferredFoot)
  );
}
export function age(birthDate) {
  if (!birthDate) return "—";
  const b = new Date(birthDate),
    n = new Date();
  return (
    n.getFullYear() -
    b.getFullYear() -
    (n.getMonth() < b.getMonth() ||
    (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())
      ? 1
      : 0)
  );
}
export const formatDate = (v) =>
  asDate(v)?.toLocaleDateString("pt-PT", {
    timeZone: "Europe/Lisbon",
    day: "numeric",
    month: "short",
    year: "numeric",
  }) || "—";
export const flag = (c) =>
  /^[A-Z]{2}$/.test(c || "")
    ? String.fromCodePoint(...c.split("").map((x) => 127397 + x.charCodeAt(0)))
    : "";
// Manter o domínio técnico antigo para preservar o acesso das contas existentes.
export const technicalEmail = (u) => `${u}@auth.weeklyfc.app`;
export function normalizeUsername(u) {
  const v = u.trim().toLowerCase();
  if (!/^[a-z0-9_.-]{3,20}$/.test(v))
    throw Error("Username: 3–20 letras sem acentos, números, _, - ou .");
  return v;
}
