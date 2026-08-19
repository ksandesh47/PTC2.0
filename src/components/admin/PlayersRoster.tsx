"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type PlayerRow = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  ntrpRating: string | null;
  isActive: boolean;
};

type EditingRow = {
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  ntrpRating: string | null;
  isActive: boolean;
};

function formatPhone(raw: string | null): string {
  if (!raw) return "—";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return raw;
}

export function PlayersRoster({ roster }: Readonly<{ roster: PlayerRow[] }>) {
  const router = useRouter();
  const [editMode, setEditMode] = useState(false);
  const [query, setQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<Map<string, EditingRow>>(new Map());
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return roster.filter((p) => {
      if (!showInactive && !p.isActive) return false;
      if (!q) return true;
      const hay = `${p.firstName} ${p.lastName} ${p.email ?? ""} ${p.phone ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [roster, query, showInactive]);

  const activeCount = roster.filter((p) => p.isActive).length;
  const inactiveCount = roster.length - activeCount;

  async function savePlayer(player: PlayerRow) {
    const edit = editing.get(player.id);
    if (!edit) return;

    setSaving((s) => new Set(s).add(player.id));
    setErrors((e) => new Map(e).set(player.id, ""));

    try {
      const res = await fetch(`/api/players/${player.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edit),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = typeof data.error === "string" ? data.error : "Failed to save";
        setErrors((e) => new Map(e).set(player.id, msg));
        return;
      }

      setEditing((m) => {
        const next = new Map(m);
        next.delete(player.id);
        return next;
      });

      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      setErrors((e) => new Map(e).set(player.id, msg));
    } finally {
      setSaving((s) => {
        const next = new Set(s);
        next.delete(player.id);
        return next;
      });
    }
  }

  function cancelEdit(playerId: string) {
    setEditing((m) => {
      const next = new Map(m);
      next.delete(playerId);
      return next;
    });
    setErrors((e) => {
      const next = new Map(e);
      next.delete(playerId);
      return next;
    });
  }

  function startEdit(player: PlayerRow) {
    setEditing((m) => new Map(m).set(player.id, {
      firstName: player.firstName,
      lastName: player.lastName,
      phone: player.phone,
      email: player.email,
      ntrpRating: player.ntrpRating,
      isActive: player.isActive,
    }));
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center flex-1">
          <input
            type="text"
            placeholder="Filter…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 min-w-0 rounded-md border border-(--color-border) bg-(--color-surface) px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-xs sm:text-sm whitespace-nowrap">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Inactive ({inactiveCount})
          </label>
        </div>
        <button
          type="button"
          onClick={() => setEditMode(!editMode)}
          className={`w-full sm:w-auto rounded-md px-2 sm:px-3 py-2 text-xs sm:text-sm font-semibold transition-colors ${
            editMode
              ? "bg-(--color-navy-500) text-white hover:bg-(--color-navy-600)"
              : "border border-(--color-border) bg-(--color-surface) hover:bg-(--color-navy-50)"
          }`}
        >
          {editMode ? "Done editing" : "Edit players"}
        </button>
      </div>

      <div className="rounded-lg border border-(--color-border) bg-(--color-surface) overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-max">
          <thead className="bg-(--color-navy-50) text-xs uppercase tracking-wider text-(--color-text-muted)">
            <tr>
              <th className="sticky left-0 z-20 w-10 min-w-10 bg-(--color-navy-50) px-2 py-2 text-left">#</th>
              <th className="sticky left-10 z-20 w-40 min-w-40 max-w-40 bg-(--color-navy-50) px-2 py-2 text-left">Name</th>
              <th className="px-2 py-2 text-left min-w-[90px]">Phone</th>
              <th className="px-2 py-2 text-left min-w-[110px]">Email</th>
              <th className="px-2 py-2 text-left min-w-[45px]">NTRP</th>
              <th className="px-2 py-2 text-left min-w-[65px]">Status</th>
              <th className="sticky right-0 z-20 min-w-[90px] bg-(--color-navy-50) px-2 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--color-border)">
            {filtered.map((p, idx) => {
              const isEditing = editing.has(p.id);
              const edit = editing.get(p.id);
              const error = errors.get(p.id);
              const isSaving = saving.has(p.id);

              return (
                <tr key={p.id} className={isEditing ? "bg-(--color-navy-50)" : p.isActive ? "" : "opacity-60"}>
                  <td className="sticky left-0 z-10 w-10 min-w-10 bg-(--color-surface) px-2 py-2 text-(--color-text-muted)">{idx + 1}</td>
                  <td className={`sticky left-10 z-10 w-40 min-w-40 max-w-40 px-2 py-2 ${isEditing ? "bg-(--color-navy-50)" : "bg-(--color-surface)"}`}>
                    {isEditing && edit ? (
                      <div className="space-y-0.5">
                        <input
                          type="text"
                          value={edit.firstName}
                          onChange={(e) =>
                            setEditing((m) => new Map(m).set(p.id, { ...edit, firstName: e.target.value }))
                          }
                          placeholder="First"
                          className="w-full rounded border border-(--color-border) px-1.5 py-0.5 text-xs h-7"
                        />
                        <input
                          type="text"
                          value={edit.lastName}
                          onChange={(e) =>
                            setEditing((m) => new Map(m).set(p.id, { ...edit, lastName: e.target.value }))
                          }
                          placeholder="Last"
                          className="w-full rounded border border-(--color-border) px-1.5 py-0.5 text-xs h-7"
                        />
                      </div>
                    ) : (
                      <span className="font-semibold">
                        {p.firstName} {p.lastName}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-(--color-text-muted)">
                    {isEditing && edit ? (
                      <input
                        type="tel"
                        value={edit.phone ?? ""}
                        onChange={(e) =>
                          setEditing((m) => new Map(m).set(p.id, { ...edit, phone: e.target.value || null }))
                        }
                        placeholder="123-456-7890"
                        className="w-full rounded border border-(--color-border) px-1.5 py-0.5 text-xs h-7"
                      />
                    ) : (
                      formatPhone(p.phone)
                    )}
                  </td>
                  <td className="px-2 py-2 text-(--color-text-muted)">
                    {isEditing && edit ? (
                      <input
                        type="email"
                        value={edit.email ?? ""}
                        onChange={(e) =>
                          setEditing((m) => new Map(m).set(p.id, { ...edit, email: e.target.value || null }))
                        }
                        placeholder="player@example.com"
                        className="w-full rounded border border-(--color-border) px-1.5 py-0.5 text-xs h-7"
                      />
                    ) : (
                      p.email ?? "—"
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {isEditing && edit ? (
                      <input
                        type="text"
                        value={edit.ntrpRating ?? ""}
                        onChange={(e) =>
                          setEditing((m) =>
                            new Map(m).set(p.id, { ...edit, ntrpRating: e.target.value || null })
                          )
                        }
                        placeholder="3.5"
                        className="w-full rounded border border-(--color-border) px-1.5 py-0.5 text-xs h-7"
                      />
                    ) : (
                      p.ntrpRating ?? "—"
                    )}
                  </td>
                  <td className="px-2 py-2">
                    {isEditing && edit ? (
                      <label className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={edit.isActive}
                          onChange={(e) =>
                            setEditing((m) => new Map(m).set(p.id, { ...edit, isActive: e.target.checked }))
                          }
                        />
                        Active
                      </label>
                    ) : (
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                          p.isActive
                            ? "bg-(--color-forest-100) text-(--color-forest-700)"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {p.isActive ? "Active" : "Inactive"}
                      </span>
                    )}
                  </td>
                  <td className={`sticky right-0 z-10 min-w-[90px] px-2 py-2 ${isEditing ? "bg-(--color-navy-50)" : "bg-(--color-surface)"}`}>
                    {isEditing ? (
                      <div className="flex flex-wrap gap-0.5 justify-center">
                        <button
                          type="button"
                          onClick={() => savePlayer(p)}
                          disabled={isSaving}
                          className="rounded px-1.5 py-0.5 text-xs font-semibold bg-(--color-forest-500) text-white hover:bg-(--color-forest-600) disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => cancelEdit(p.id)}
                          disabled={isSaving}
                          className="rounded px-1.5 py-0.5 text-xs font-semibold border border-(--color-border) hover:bg-(--color-navy-50) disabled:opacity-50"
                        >
                          ✕
                        </button>
                      </div>
                    ) : editMode ? (
                      <button
                        type="button"
                        onClick={() => startEdit(p)}
                        className="rounded px-2 py-1 text-xs font-semibold border border-(--color-border) hover:bg-(--color-navy-50)"
                      >
                        Edit
                      </button>
                    ) : null}
                    {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-sm text-(--color-text-muted)">
                  No players match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
