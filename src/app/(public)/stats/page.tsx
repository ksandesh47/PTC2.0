import { formatDate } from "@/lib/utils";
import { getStandingsLabel, palominoLeagueRules } from "@/lib/league/rules";
import { getActiveSeasonProjection } from "@/lib/league/season-projection";
import type {
  LeagueMatch,
  LeagueStandingsEntry,
  PlayerMatchScorecard,
} from "@/lib/league/scorecards";
import { StatsTable } from "@/components/stats/StatsTable";

export const revalidate = 60;

const MIN_MATCHES = palominoLeagueRules.standings.topMatchCount;

function DataUnavailable() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
      <h1 className="font-display text-5xl tracking-widest text-(--color-clay-500)">STATS</h1>
      <p className="text-(--color-text-muted)">Data is temporarily unavailable. Please try again shortly.</p>
    </div>
  );
}

type HighlightMatchInfo = { name: string; date: string };

export default async function StatsPage() {
  let season: Awaited<ReturnType<typeof getActiveSeasonProjection>>["season"] = null;
  let standings: Awaited<ReturnType<typeof getActiveSeasonProjection>>["standings"] = [];
  let completedMatches: Awaited<ReturnType<typeof getActiveSeasonProjection>>["completedMatches"] = [];
  let scorecardsByMatch: Map<string, PlayerMatchScorecard[]> = new Map();
  let displayNameMap = new Map<string, string>();
  try {
    const projection = await getActiveSeasonProjection();
    season = projection.season;
    standings = projection.standings;
    completedMatches = projection.completedMatches;
    scorecardsByMatch = projection.scorecardsByMatch;
    displayNameMap = projection.displayNameMap;
  } catch {
    return <DataUnavailable />;
  }

  if (!season) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-(--color-text-muted)">
        No active season found.
      </div>
    );
  }

  const highlights = buildSeasonHighlights(completedMatches, scorecardsByMatch, standings, displayNameMap);
  const displayNames = Object.fromEntries(
    standings.map((row) => [row.playerId, displayNameMap.get(row.playerId) ?? row.playerName])
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <div>
        <h1 className="font-display text-5xl tracking-widest text-(--color-clay-500)">
          STATS
        </h1>
        <p className="mt-1 text-sm text-(--color-text-muted)">
          {season.name} · sorted by average · league scoring: {getStandingsLabel()} match scores over {palominoLeagueRules.matchFormat.setsPerMatch} rotating sets.
        </p>
      </div>

      <StatsTable
        rows={standings}
        displayNames={displayNames}
        standingsLabel={getStandingsLabel()}
        minMatches={MIN_MATCHES}
      />

      <section className="-mt-2 space-y-3">
        <h2 className="font-display text-2xl tracking-wider">⚡ Season Highlights</h2>
        <div className="grid grid-cols-2 gap-3">
          <HighlightCard
            icon="👑"
            title="Current Leader"
            value={highlights.leader.name}
            subtitle={highlights.leader.detail}
          />
          <HighlightCard
            icon="🏅"
            title="Most Sets Won Overall"
            value={highlights.mostSetsWon.value}
            subtitle={highlights.mostSetsWon.name}
          />
          <HighlightCard
            icon="🔥"
            title="Highest Match Score"
            value={highlights.highScore.value}
            subtitle={highlights.highScore.matches}
          />
          <HighlightCard
            icon="🐢"
            title="Lowest Match Score"
            value={highlights.lowScore.value}
            subtitle={highlights.lowScore.matches}
          />
          <HighlightCard
            icon="📈"
            title="Most Improved"
            value={highlights.mostImproved.name}
            subtitle={highlights.mostImproved.detail}
          />
          <HighlightCard
            icon="📉"
            title="Least Improved"
            value={highlights.leastImproved.name}
            subtitle={highlights.leastImproved.detail}
          />
          <HighlightCard
            icon="🎯"
            title="Most Consistent"
            value={highlights.mostConsistent.name}
            subtitle={highlights.mostConsistent.detail}
          />
          <HighlightCard
            icon="📊"
            title="Least Consistent"
            value={highlights.leastConsistent.name}
            subtitle={highlights.leastConsistent.detail}
          />
        </div>
      </section>
    </div>
  );
}

function buildSeasonHighlights(
  completedMatches: LeagueMatch[],
  scorecardsByMatch: Map<string, PlayerMatchScorecard[]>,
  standings: LeagueStandingsEntry[],
  displayNameMap: Map<string, string>
) {
  type FlatScorecard = PlayerMatchScorecard & { date: string | Date | undefined };

  const flat: FlatScorecard[] = [];
  for (const match of completedMatches) {
    const scs = scorecardsByMatch.get(match.id) ?? [];
    for (const sc of scs) {
      flat.push({ ...sc, date: match.slot?.slotDate });
    }
  }

  const emptyHighlight = { value: "–" as string | number, matches: "" };
  if (flat.length === 0) {
    const leader = standings[0];
    const emptyPlayerHighlight = { name: "–", detail: "" };
    return {
      highScore: emptyHighlight,
      lowScore: emptyHighlight,
      mostSetsWon: { value: 0 as string | number, name: "" },
      leader: {
        name: leader ? (displayNameMap.get(leader.playerId) ?? leader.playerName) : "–",
        detail: leader ? `${leader.standingsTotal} pts · ${leader.setsWon} SW` : "",
      },
      mostImproved: emptyPlayerHighlight,
      leastImproved: emptyPlayerHighlight,
      mostConsistent: emptyPlayerHighlight,
      leastConsistent: emptyPlayerHighlight,
    };
  }

  const maxScore = Math.max(...flat.map((sc) => sc.score));
  const minScore = Math.min(...flat.map((sc) => sc.score));

  const highScoreEntries = flat.filter((sc) => sc.score === maxScore);
  const lowScoreEntries = flat.filter((sc) => sc.score === minScore);

  function formatEntries(entries: FlatScorecard[]): string {
    return entries
      .slice(0, 3)
      .map((entry) => {
        const info: HighlightMatchInfo = {
          name: displayNameMap.get(entry.playerId) ?? entry.playerId,
          date: entry.date ? formatDate(entry.date) : `Week ${entry.weekNumber}`,
        };
        return `${info.name} · ${info.date}`;
      })
      .join(" · ");
  }

  const mostSetsWon = [...standings].sort((a, b) => b.setsWon - a.setsWon)[0];
  const leader = standings[0];

  const scorecardsByPlayer = new Map<string, FlatScorecard[]>();
  for (const scorecard of flat) {
    const playerCards = scorecardsByPlayer.get(scorecard.playerId) ?? [];
    playerCards.push(scorecard);
    scorecardsByPlayer.set(scorecard.playerId, playerCards);
  }

  const trends = [...scorecardsByPlayer.entries()]
    .map(([playerId, cards]) => {
      const chronological = [...cards].sort((a, b) => {
        const aDate = a.date ? new Date(a.date).getTime() : 0;
        const bDate = b.date ? new Date(b.date).getTime() : 0;
        return aDate - bDate || a.weekNumber - b.weekNumber;
      });
      if (chronological.length < 2) return null;

      const splitIndex = Math.floor(chronological.length / 2);
      const early = chronological.slice(0, splitIndex).map((card) => card.score);
      const recent = chronological.slice(splitIndex).map((card) => card.score);
      const earlyAverage = average(early);
      const recentAverage = average(recent);
      const mean = average(chronological.map((card) => card.score));
      const variance = chronological.reduce(
        (sum, card) => sum + (card.score - mean) ** 2,
        0
      ) / (chronological.length - 1);

      return {
        playerId,
        name: displayNameMap.get(playerId) ?? playerId,
        improvement: recentAverage - earlyAverage,
        earlyAverage,
        recentAverage,
        averageScore: mean,
        standardDeviation: Math.sqrt(variance),
        matches: chronological.length,
      };
    })
    .filter((trend): trend is NonNullable<typeof trend> => trend !== null);

  const mostImproved = [...trends].sort((a, b) => b.improvement - a.improvement)[0];
  const leastImproved = [...trends].sort((a, b) => a.improvement - b.improvement)[0];
  const mostConsistent = [...trends].sort((a, b) => a.standardDeviation - b.standardDeviation)[0];
  const leastConsistent = [...trends].sort((a, b) => b.standardDeviation - a.standardDeviation)[0];

  function trendHighlight(trend: (typeof trends)[number] | undefined, includeDirection = false) {
    if (!trend) return { name: "–", detail: "" };
    if (!includeDirection) {
      return {
        name: trend.name,
        detail: `${trend.standardDeviation.toFixed(2)} std dev · ${trend.averageScore.toFixed(1)} avg over ${trend.matches} matches`,
      };
    }
    return {
      name: trend.name,
      detail: `${trend.improvement >= 0 ? "+" : ""}${trend.improvement.toFixed(1)} avg pts · ${trend.earlyAverage.toFixed(1)} early → ${trend.recentAverage.toFixed(1)} recent`,
    };
  }

  return {
    highScore: {
      value: maxScore as string | number,
      matches: formatEntries(highScoreEntries),
    },
    lowScore: {
      value: minScore as string | number,
      matches: formatEntries(lowScoreEntries),
    },
    mostSetsWon: {
      value: (mostSetsWon?.setsWon ?? 0) as string | number,
      name: mostSetsWon ? (displayNameMap.get(mostSetsWon.playerId) ?? mostSetsWon.playerName) : "",
    },
    leader: {
      name: leader ? (displayNameMap.get(leader.playerId) ?? leader.playerName) : "–",
      detail: leader ? `${leader.standingsTotal} Top-${MIN_MATCHES} pts · ${leader.setsWon} SW` : "",
    },
    mostImproved: trendHighlight(mostImproved, true),
    leastImproved: trendHighlight(leastImproved, true),
    mostConsistent: trendHighlight(mostConsistent),
    leastConsistent: trendHighlight(leastConsistent),
  };
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function HighlightCard({
  icon,
  title,
  value,
  subtitle,
}: Readonly<{ icon: string; title: string; value: string | number; subtitle: string }>) {
  return (
    <div className="rounded-xl border border-(--color-border) border-l-4 border-l-(--color-clay-400) bg-(--color-surface) p-5 shadow-sm">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-(--color-text-muted)">
        <span className="text-lg leading-none">{icon}</span>
        <span>{title}</span>
      </div>
      <p className="mt-2 font-display text-3xl tracking-wider text-(--color-clay-600)">{value}</p>
      {subtitle && <p className="mt-1 text-xs text-(--color-text-muted)">{subtitle}</p>}
    </div>
  );
}
