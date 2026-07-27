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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[220px]">
          <input
            type="text"
            placeholder="Filter by name, email, or phone…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 min-w-[220px] rounded-md border border-[--color-border] bg-[--color-surface] px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm whitespace-nowrap">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Include inactive ({inactiveCount})
          </label>
        </div>
        <button
          type="button"
          onClick={() => setEditMode(!editMode)}
          className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
            editMode
              ? "bg-[--color-clay-500] text-white hover:bg-[--color-clay-600]"
              : "border border-[--color-border] bg-[--color-surface] hover:bg-[--color-clay-50]"
          }`}
        >
          {editMode ? "✓ Done Editing" : "✏ Edit Mode"}
        </button>
      </div>

      <div className="rounded-lg border border-[--color-border] bg-[--color-surface] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[--color-clay-50] text-xs uppercase tracking-wider text-[--color-text-muted]">
            <tr>
              <th className="px-3 py-2 text-left w-10">#</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Phone</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">NTRP</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[--color-border]">
            {filtered.map((p, idx) => {
              const isEditing = editing.has(p.id);
              const edit = editing.get(p.id);
              const error = errors.get(p.id);
              const isSaving = saving.has(p.id);

              return (
                <tr key={p.id} className={isEditing ? "bg-[--color-clay-50]" : p.isActive ? "" : "opacity-60"}>
                  <td className="px-3 py-2 text-[--color-text-muted]">{idx + 1}</td>
                  <td className="px-3 py-2">
                    {isEditing && edit ? (
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={edit.firstName}
                          onChange={(e) =>
                            setEditing((m) => new Map(m).set(p.id, { ...edit, firstName: e.target.value }))
                          }
                          placeholder="First"
                          className="w-full rounded border border-[--color-border] px-2 py-1 text-xs"
                        />
                        <input
                          type="text"
                          value={edit.lastName}
                          onChange={(e) =>
                            setEditing((m) => new Map(m).set(p.id, { ...edit, lastName: e.target.value }))
                          }
                          placeholder="Last"
                          className="w-full rounded border border-[--color-border] px-2 py-1 text-xs"
                        />
                      </div>
                    ) : (
                      <span className="font-semibold">
                        {p.firstName} {p.lastName}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-[--color-text-muted]">
                    {isEditing && edit ? (
                      <input
                        type="tel"
                        value={edit.phone ?? ""}
                        onChange={(e) =>
                          setEditing((m) => new Map(m).set(p.id, { ...edit, phone: e.target.value || null }))
                        }
                        placeholder="123-456-7890"
                        className="w-full rounded border border-[--color-border] px-2 py-1 text-xs"
                      />
                    ) : (
                      formatPhone(p.phone)
                    )}
                  </td>
                  <td className="px-3 py-2 text-[--color-text-muted]">
                    {isEditing && edit ? (
                      <input
                        type="email"
                        value={edit.email ?? ""}
                        onChange={(e) =>
                          setEditing((m) => new Map(m).set(p.id, { ...edit, email: e.target.value || null }))
                        }
                        placeholder="player@example.com"
                        className="w-full rounded border border-[--color-border] px-2 py-1 text-xs"
                      />
                    ) : (
                      p.email ?? "—"
                    )}
                  </td>
                  <td className="px-3 py-2">
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
                        className="w-full rounded border border-[--color-border] px-2 py-1 text-xs"
                      />
                    ) : (
                      p.ntrpRating ?? "—"
                    )}
                  </td>
                  <td className="px-3 py-2">
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
                            ? "bg-[--color-forest-100] text-[--color-forest-700]"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {p.isActive ? "Active" : "Inactive"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 min-w-[120px]">
                    {isEditing ? (
                      <div className="flex flex-wrap gap-1 justify-center">
                        <button
                          type="button"
                          onClick={() => savePlayer(p)}
                          disabled={isSaving}
                          className="rounded px-2 py-1 text-xs font-semibold bg-[--color-forest-500] text-white hover:bg-[--color-forest-600] disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => cancelEdit(p.id)}
                          disabled={isSaving}
                          className="rounded px-2 py-1 text-xs font-semibold border border-[--color-border] hover:bg-[--color-clay-50] disabled:opacity-50"
                        >
                          ✕
                        </button>
                      </div>
                    ) : editMode ? (
                      <button
                        type="button"
                        onClick={() => startEdit(p)}
                        className="rounded px-2 py-1 text-xs font-semibold border border-[--color-border] hover:bg-[--color-clay-50]"
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
                <td colSpan={7} className="px-3 py-6 text-center text-sm text-[--color-text-muted]">
                  No players match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
