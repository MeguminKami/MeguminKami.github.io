import { cardWeek } from "./card-week.js";
import { balanceBoost } from "./team-balance.js";
import * as DB from "./db.js";
import {
  asDate,
  calculateInitialBaseline,
  calculatePlayerStats,
  calculateInactivity,
  calculateOverall,
  normalizeOvrWeights,
  calculateBaseCard,
  calculateSpecialCards,
  calculateMatchStats,
  completeInitial,
  participants,
  matchOutcome,
  matchPerformance,
} from "./utils.js";
export async function loadLeague() {
  const [
    users,
    initials,
    community,
    games,
    summaries,
    settings,
    balances,
    weeklyCards,
    weeklyPhotos,
  ] = await Promise.all([
    DB.users(),
    DB.initials(),
    DB.communitySummaries(),
    DB.games(),
    DB.gameSummaries(),
    DB.read("settings/ovr"),
    DB.list("gameBalances"),
    DB.list("weeklyCards"),
    DB.weeklyCardPhotos(cardWeek().weekId),
  ]);
  const cycle = cardWeek();
  const ovrWeights = normalizeOvrWeights(settings);
  const players = users
    .filter((u) => !u.disabled)
    .map((u) => {
      const initial = initials.find((x) => x.uid === u.uid)?.ratings20 || {},
        cs = community.find((x) => x.targetId === u.uid),
        matches = games.filter((g) => participants(g).includes(u.uid));
      const aggregates = matches
        .filter((g) => g.status === "closed")
        .map((g) => ({
          ...(summaries.find((x) => x.id === g.id)?.players?.[u.uid] || {}),
          ...matchPerformance(u.uid, g),
          outcome: matchOutcome(u.uid, g),
          balanceBoost: balanceBoost(
            u.uid,
            g,
            balances.find((b) => b.id === g.id),
          ),
          date: asDate(g.closedAt || g.scheduledAt),
          gameId: g.id,
        }))
        .sort((a, b) => a.date - b.date);
      const stats = calculatePlayerStats(
          calculateInitialBaseline(initial, cs),
          aggregates,
        ),
        inactivity = calculateInactivity(
          u.uid,
          games,
          u.createdAt || initials.find((x) => x.uid === u.uid)?.createdAt,
        ),
        ovr = calculateOverall(
          stats,
          ovrWeights,
          u.primaryPosition,
          inactivity,
        );
      return {
        ...u,
        cardPhoto: weeklyPhotos.find((photo) => photo.uid === u.uid) || null,
        initial,
        communityCount: cs?.count || 0,
        community: cs,
        official: (cs?.count || 0) >= 3,
        hasCard: completeInitial(initial),
        stats,
        inactivity,
        ovr,
        cardType: calculateBaseCard(ovr),
        specials: calculateSpecialCards(aggregates),
        cardAggregates: aggregates,
        aggregates: aggregates.filter((a) => Number.isFinite(a.overall)),
        matches,
        matchStats: calculateMatchStats(u.uid, games),
        ...(cycle.phase === "closed"
          ? (() => {
              const snapshot = weeklyCards.find(
                (c) => c.uid === u.uid && c.weekId === cycle.weekId,
              );
              return snapshot
                ? {
                    ...snapshot.appearance,
                    stats: snapshot.stats,
                    cardPhoto: snapshot.cardPhoto || null,
                    ovr: snapshot.ovr,
                    inactivity: snapshot.inactivity || {
                      missed: 0,
                      penalty: 0,
                    },
                    cardType: snapshot.baseCard,
                    specials: snapshot.specials || [],
                    primaryPosition:
                      snapshot.primaryPosition || u.primaryPosition,
                    official: snapshot.official,
                    hasCard: true,
                    cardLocked: true,
                    cardCalculation: snapshot.ovrCalculation,
                  }
                : { hasCard: false, cardLocked: true };
            })()
          : {}),
      };
    });
  return {
    cycle,
    balances,
    ovrWeights,
    users,
    players,
    games: games.sort(
      (a, b) => (asDate(b.scheduledAt) || 0) - (asDate(a.scheduledAt) || 0),
    ),
    initials,
    community,
    summaries,
  };
}
