'use client';

import { useState, useEffect } from 'react';
import type { Incident } from './BrownLineMap';

// Each pair: left = good (green), right = bad (red)
export const PAIRS = [
  { good: 'Clean',   bad: 'Dirty'   },
  { good: 'Quiet',   bad: 'Loud'    },
  { good: 'Safe',    bad: 'Unsafe'  },
  { good: 'Empty',   bad: 'Crowded' },
  { good: 'On Time', bad: 'Delayed' },
  { good: 'Working', bad: 'Broken'  },
] as const;

export type IncidentType = typeof PAIRS[number]['good'] | typeof PAIRS[number]['bad'];

export function typePolarity(t: string): 'good' | 'bad' | null {
  for (const p of PAIRS) {
    if (p.good === t) return 'good';
    if (p.bad  === t) return 'bad';
  }
  return null;
}

type Props = {
  prefillRn?: string;
  onSubmitted: (incident: Incident) => void;
};

export default function IncidentForm({ prefillRn = '', onSubmitted }: Props) {
  const [runNumber, setRunNumber] = useState(prefillRn);
  const [carNumber, setCarNumber] = useState('');
  const [type, setType]           = useState<string>('');
  const [summary, setSummary]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState(false);

  useEffect(() => {
    if (prefillRn) setRunNumber(prefillRn);
  }, [prefillRn]);

  const wordCount = summary.trim().split(/\s+/).filter(Boolean).length;
  const canSubmit = runNumber.trim() && type && wordCount === 2 && !submitting;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!type)           { setError('Select an incident type.'); return; }
    if (wordCount !== 2) { setError('Summary must be exactly two words.'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runNumber, carNumber, type, summary: summary.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Submission failed.'); return; }
      onSubmitted(data as Incident);
      setSummary('');
      setCarNumber('');
      setType('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('Network error — try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 pb-8">

      {/* Run # and Car # side-by-side */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-300">Train Run #</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="e.g. 426"
            value={runNumber}
            onChange={e => setRunNumber(e.target.value)}
            required
            className="h-12 px-4 rounded-xl bg-zinc-900 border border-zinc-800 text-base text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-300">Car #</label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="e.g. 1"
            value={carNumber}
            onChange={e => setCarNumber(e.target.value)}
            className="h-12 px-4 rounded-xl bg-zinc-900 border border-zinc-800 text-base text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
          />
        </div>
      </div>

      {/* Good / Bad pairs */}
      <div className="flex flex-col gap-2">
        {/* Column headers */}
        <div className="grid grid-cols-2 gap-2 px-0.5">
          <span className="text-xs font-semibold text-green-600 uppercase tracking-widest text-center">Good</span>
          <span className="text-xs font-semibold text-red-600   uppercase tracking-widest text-center">Bad</span>
        </div>

        {PAIRS.map(pair => (
          <div key={pair.good} className="grid grid-cols-2 gap-2">
            {/* Good option */}
            <button
              type="button"
              onClick={() => setType(prev => prev === pair.good ? '' : pair.good)}
              className={`h-11 rounded-xl text-sm font-medium border transition-colors ${
                type === pair.good
                  ? 'bg-green-950 border-green-700 text-green-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 active:bg-zinc-800'
              }`}
            >
              {pair.good}
            </button>
            {/* Bad option */}
            <button
              type="button"
              onClick={() => setType(prev => prev === pair.bad ? '' : pair.bad)}
              className={`h-11 rounded-xl text-sm font-medium border transition-colors ${
                type === pair.bad
                  ? 'bg-red-950 border-red-700 text-red-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 active:bg-zinc-800'
              }`}
            >
              {pair.bad}
            </button>
          </div>
        ))}
      </div>

      {/* Two-word comment */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-zinc-300 flex justify-between">
          Two-Word Comment
          <span className={wordCount === 2 ? 'text-green-500' : 'text-zinc-600'}>
            {wordCount}/2
          </span>
        </label>
        <input
          type="text"
          placeholder="e.g. broken seat"
          value={summary}
          onChange={e => setSummary(e.target.value)}
          required
          maxLength={40}
          className="h-12 px-4 rounded-xl bg-zinc-900 border border-zinc-800 text-base text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
        />
      </div>

      {error   && <p className="text-sm text-red-400 -mt-2">{error}</p>}
      {success && <p className="text-sm text-green-400 -mt-2">Report added to the feed ✓</p>}

      <button
        type="submit"
        disabled={!canSubmit}
        className="h-14 rounded-xl bg-[#6b3a1f] active:bg-[#7e4526] disabled:opacity-35 text-base font-semibold text-white transition-colors"
      >
        {submitting ? 'Submitting…' : 'Submit Report'}
      </button>
    </form>
  );
}
