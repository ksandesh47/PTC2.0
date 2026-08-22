"use client";

import { useMemo, useState } from "react";
import type { LeagueStandingsEntry } from "@/lib/league/scorecards";

type SortKey = "rank" | "player" | "averageScore" | "total" | "standingsTotal" | "highScore" | "lowScore" | "matchesPlayed" | "matchesCanceled" | "setsWon" | "setsLost" | "threeSetsWon" | "threeSetsLost";
type SortDirection = "asc" | "desc";

type Props = {
  rows: LeagueStandingsEntry[];
  displayNames: Record<string, string>;
  standingsLabel: string;
  minMatches: number;
};

const columns: Array<{ key: SortKey; label: string; align: "left" | "right" }> = [
  { key: "rank", label: "#", align: "right" },
  { key: "player", label: "Player", align: "left" },
  { key: "averageScore", label: "Avg", align: "right" },
  { key: "total", label: "Total", align: "right" },
  { key: "highScore", label: "High", align: "right" },
  { key: "lowScore", label: "Low", align: "right" },
  { key: "matchesPlayed", label: "M", align: "right" },
  { key: "matchesCanceled", label: "CAN", align: "right" },
  { key: "setsWon", label: "SW", align: "right" },
  { key: "setsLost", label: "SL", align: "right" },
  { key: "threeSetsWon", label: "3SW", align: "right" },
  { key: "threeSetsLost", label: "3SL", align: "right" },
];

export function StatsTable({ rows, displayNames, standingsLabel, minMatches }: Readonly<Props>) {
  const [sortKey, setSortKey] = useState<SortKey>("averageScore");
  const [direction, setDirection] = useState<SortDirection>("desc");

  function changeSort(nextKey: SortKey) {
    if (nextKey === sortKey) {
      setDirection((current) => (current === "desc" ? "asc" : "desc"));
    } else {
      setSortKey(nextKey);
      setDirection(nextKey === "player" ? "asc" : "desc");
    }
  }

  const sortedRows = useMemo(() => {
    return [...rows].sort((left, right) => {
      const leftName = displayNames[left.playerId] ?? left.playerName;
      const rightName = displayNames[right.playerId] ?? right.playerName;
      const leftValue = sortKey === "player" ? leftName : left[sortKey];
      const rightValue = sortKey === "player" ? rightName : right[sortKey];
      const comparison = typeof leftValue === "string" && typeof rightValue === "string"
        ? leftValue.localeCompare(rightValue)
        : Number(leftValue) - Number(rightValue);
      return direction === "asc" ? comparison : -comparison;
    });
  }, [direction, displayNames, rows, sortKey]);

  function indicator(key: SortKey) {
    if (key !== sortKey) return "↕";
    return direction === "asc" ? "↑" : "↓";
  }

  return (
    <div className="relative rounded-lg border border-(--color-border) bg-(--color-surface) after:pointer-events-none after:absolute after:inset-y-0 after:right-0 after:w-8 after:bg-gradient-to-l after:from-(--color-surface) after:to-transparent sm:after:hidden">
      <div className="overflow-x-auto">
        <table className="min-w-max w-full text-sm" aria-label="League stats table">
        <thead className="bg-(--color-clay-50) text-xs uppercase tracking-widest text-(--color-text-muted)">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-3 py-3 ${column.align === "right" ? "text-right" : "text-left"} ${
                  column.key === "rank"
                    ? "sticky left-0 z-20 w-10 min-w-10 bg-(--color-clay-50)"
                    : column.key === "player"
                      ? "sticky left-10 z-20 w-40 min-w-40 max-w-40 bg-(--color-clay-50)"
                      : ""
                }`}
              >
                <button type="button" onClick={() => changeSort(column.key)} className="inline-flex items-center gap-1 font-semibold hover:text-(--color-clay-600)">
                  {column.label}
                  <span aria-hidden="true" className={column.key === sortKey ? "text-(--color-clay-600)" : "opacity-40"}>{indicator(column.key)}</span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-(--color-border)">
          {sortedRows.map((row, index) => {
            const name = displayNames[row.playerId] ?? row.playerName;
            const remaining = minMatches - row.matchesPlayed;
            const tooltip = remaining > 0 ? `${name} needs ${remaining} more match${remaining === 1 ? "" : "es"}` : undefined;
            return (
              <tr key={row.playerId} className="hover:bg-(--color-clay-50) transition-colors">
                <td className="sticky left-0 z-10 w-10 min-w-10 bg-(--color-surface) px-3 py-3 text-right text-(--color-text-muted) font-mono">{index < 3 ? ["🥇", "🥈", "🥉"][index] : index + 1}</td>
                <td className="sticky left-10 z-10 w-40 min-w-40 max-w-40 bg-(--color-surface) px-3 py-3 font-semibold" title={tooltip}>
                  <span className="inline-flex max-w-full items-baseline gap-1 truncate">
                    <span>{name}</span>
                    <span className="text-[0.65em] font-mono font-normal text-(--color-text-muted)">{row.matchesPlayed}</span>
                  </span>
                </td>
                <td className="px-3 py-3 text-right font-bold text-(--color-clay-600)">{row.averageScore.toFixed(1)}</td>
                <td className="px-3 py-3 text-right">{row.total}</td>
                <td className="px-3 py-3 text-right">{row.highScore}</td>
                <td className="px-3 py-3 text-right">{row.lowScore}</td>
                <td className="px-3 py-3 text-right">{row.matchesPlayed}</td>
                <td className="px-3 py-3 text-right">{row.matchesCanceled}</td>
                <td className="px-3 py-3 text-right">{row.setsWon}</td>
                <td className="px-3 py-3 text-right">{row.setsLost}</td>
                <td className="px-3 py-3 text-right">{row.threeSetsWon}</td>
                <td className="px-3 py-3 text-right">{row.threeSetsLost}</td>
              </tr>
            );
          })}
        </tbody>
        </table>
      </div>
      <div className="border-t border-(--color-border) px-3 py-3 text-xs text-(--color-text-muted)">
        <p className="font-semibold uppercase tracking-wider">Legend</p>
        <p className="mt-1">Avg = average score · Total = all match points · High/Low = highest/lowest match score · M = matches played · CAN = canceled matches · SW/SL = sets won/lost · 3SW/3SL = matches won/lost in all three sets.</p>
      </div>
    </div>
  );
}
