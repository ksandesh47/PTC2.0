'use client';

import { useState } from 'react';

interface SeasonEditFormProps {
  seasonId: string;
  startDate: Date | string;
  endDate: Date | string;
  onSuccess?: () => void;
}

function toDateInputValue(value: Date | string): string {
  if (typeof value === 'string') {
    return value.includes('T') ? value.split('T')[0] : value;
  }
  return value.toISOString().split('T')[0];
}

export function SeasonEditForm({
  seasonId,
  startDate,
  endDate,
  onSuccess,
}: Readonly<SeasonEditFormProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const [newStartDate, setNewStartDate] = useState(toDateInputValue(startDate));
  const [newEndDate, setNewEndDate] = useState(toDateInputValue(endDate));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/seasons/${seasonId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: newStartDate,
          endDate: newEndDate,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        const apiError = typeof data?.error === 'string'
          ? data.error
          : data?.error?.message;
        throw new Error(apiError || 'Failed to update season');
      }

      setIsOpen(false);
      onSuccess?.();
      
      // Revalidate after 500ms
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-xs rounded-md border border-[--color-border] px-2 py-1 hover:bg-[--color-clay-50] text-[--color-clay-600] font-semibold"
      >
        Edit Dates
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="text-xs space-y-2 p-3 rounded-lg bg-[--color-clay-50] border border-[--color-clay-200]">
      <div className="space-y-1">
        <label htmlFor="season-start-date" className="block font-semibold text-[--color-text-muted]">Start Date</label>
        <input
          id="season-start-date"
          type="date"
          value={newStartDate}
          onChange={(e) => setNewStartDate(e.target.value)}
          className="w-full rounded px-2 py-1 border border-[--color-border] text-sm"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="season-end-date" className="block font-semibold text-[--color-text-muted]">End Date</label>
        <input
          id="season-end-date"
          type="date"
          value={newEndDate}
          onChange={(e) => setNewEndDate(e.target.value)}
          className="w-full rounded px-2 py-1 border border-[--color-border] text-sm"
        />
      </div>
      {error && <p className="text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-md border border-[#1f2238] bg-[#1f2238] px-3 py-1.5 font-semibold text-[#f6bf45] hover:bg-[#16192b] disabled:opacity-60"
        >
          {loading ? 'Submitting...' : 'Submit Dates'}
        </button>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="flex-1 rounded-md border border-[--color-border] px-2 py-1 font-semibold hover:bg-[--color-surface]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
