import * as DB from "./db.js";
import {
  asDate,
  calculateInitialBaseline,
  calculatePlayerStats,
  calculateOverall,
  calculateBaseCard,
  calculateSpecialCards,
  calculateMatchStats,
  completeInitial,
  participants,
} from "./utils.js";
export async function loadLeague() {
  const [users, initials, community, games, summaries] = await Promise.all([
    DB.users(),
    DB.initials(),
    DB.communitySummaries(),
    DB.games(),
    DB.gameSummaries(),
  ]);
  const players = users
    .filter((u) => !u.disabled)
    .map((u) => {
      const initial = initials.find((x) => x.uid === u.uid)?.ratings20 || {},
        cs = community.find((x) => x.targetId === u.uid),
        matches = games.filter((g) => participants(g).includes(u.uid));
      const aggregates = summaries
        .filter(
          (x) =>
            x.status === "closed" &&
            participants(x).includes(u.uid) &&
            x.players?.[u.uid]?.count,
        )
        .map((x) => ({
          ...x.players[u.uid],
          date: asDate(x.closedAt || x.scheduledAt),
          gameId: x.id,
        }))
        .sort((a, b) => a.date - b.date);
      const stats = calculatePlayerStats(
          calculateInitialBaseline(initial, cs),
          aggregates,
        ),
        ovr = calculateOverall(stats);
      return {
        ...u,
        initial,
        communityCount: cs?.count || 0,
        community: cs,
        official: (cs?.count || 0) >= 3,
        hasCard: completeInitial(initial),
        stats,
        ovr,
        cardType: calculateBaseCard(ovr),
        specials: calculateSpecialCards(aggregates),
        aggregates,
        matches,
        matchStats: calculateMatchStats(u.uid, games),
      };
    });
  return {
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
