'use client';

import { useCallback, useEffect, useState } from 'react';
import BrownLineMap from './components/BrownLineMap';
import IncidentForm, { typePolarity } from './components/IncidentForm';
import type { Train, Incident } from './components/BrownLineMap';

function parseCTAResponse(data: unknown): Train[] {
  try {
    const routes = (data as { ctatt?: { route?: unknown[] } })?.ctatt?.route;
    if (!Array.isArray(routes) || routes.length === 0) return [];
    const raw = (routes[0] as { train?: unknown })?.train;
    if (!raw) return [];
    return (Array.isArray(raw) ? raw : [raw]) as Train[];
  } catch { return []; }
}

function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

const ONE_HOUR = 60 * 60 * 1000;

export default function Home() {
  const [trains, setTrains]         = useState<Train[]>([]);
  const [incidents, setIncidents]   = useState<Incident[]>([]);
  const [selectedRn, setSelectedRn] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [apiError, setApiError]     = useState<string | null>(null);
  const [tab, setTab]               = useState<'report' | 'feed'>('report');

  const fetchTrains = useCallback(async () => {
    try {
      const res  = await fetch('/api/trains');
      const data = await res.json();
      if (!res.ok) { setApiError((data as { error?: string }).error ?? 'API error'); return; }
      setTrains(parseCTAResponse(data));
      setLastUpdated(new Date());
      setApiError(null);
    } catch { setApiError('Failed to reach server'); }
  }, []);

  const fetchIncidents = useCallback(async () => {
    try {
      const res = await fetch('/api/incidents');
      if (res.ok) setIncidents(await res.json());
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchTrains();
    fetchIncidents();
    const t1 = setInterval(fetchTrains,    30_000);
    const t2 = setInterval(fetchIncidents, 10_000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [fetchTrains, fetchIncidents]);

  function handleSelectTrain(rn: string) {
    setSelectedRn(prev => prev === rn ? null : rn);
    // Switch to report tab when user taps a train
    setTab('report');
  }

  function handleSubmitted(inc: Incident) {
    setIncidents(prev => [...prev, inc]);
    // Jump to feed so they see their report
    setTimeout(() => setTab('feed'), 600);
  }

  const selectedTrain = trains.find(t => t.rn === selectedRn);
  const recentFeed    = [...incidents]
    .filter(i => Date.now() - i.timestamp < ONE_HOUR)
    .reverse();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">

      {/* ── Sticky header ── */}
      <header className="sticky top-0 z-10 bg-zinc-950/90 backdrop-blur border-b border-zinc-900 px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-3 h-3 rounded-full bg-[#6b3a1f]" />
          <span className="text-sm font-semibold tracking-tight">CTA Brown Line</span>
          {trains.length > 0 && (
            <span className="text-xs text-zinc-600">{trains.length} active</span>
          )}
        </div>
        <button
          onClick={fetchTrains}
          className="text-xs text-zinc-500 active:text-zinc-300 px-3 py-1.5 rounded-lg border border-zinc-800 active:border-zinc-700"
        >
          {lastUpdated
            ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Refresh'}
        </button>
      </header>

      <main className="px-5 py-5 flex flex-col gap-5 max-w-lg mx-auto">

        {/* API key error */}
        {apiError && (
          <div className="px-4 py-3 rounded-xl bg-red-950 border border-red-900 text-sm text-red-300">
            {apiError.includes('CTA_TRAIN_API_KEY')
              ? <>Add <code className="font-mono text-xs bg-red-900/60 px-1 rounded">CTA_TRAIN_API_KEY</code> to <code className="font-mono text-xs bg-red-900/60 px-1 rounded">.env.local</code></>
              : apiError}
          </div>
        )}

        {/* Selected-train pill */}
        {selectedTrain ? (
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-700">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-mono font-bold text-white">#{selectedTrain.rn}</span>
              <span className="text-zinc-400">→ {selectedTrain.destNm}</span>
              {selectedTrain.isDly === '1' && (
                <span className="text-amber-400 text-xs">· Delayed</span>
              )}
            </div>
            <button
              onClick={() => setSelectedRn(null)}
              className="text-sm text-zinc-600 active:text-zinc-400 px-2 py-1"
            >✕</button>
          </div>
        ) : (
          <p className="text-sm text-zinc-600 text-center">
            Tap a train to select it
          </p>
        )}

        {/* Map */}
        <BrownLineMap
          trains={trains}
          incidents={incidents}
          selectedRn={selectedRn}
          onSelectTrain={handleSelectTrain}
        />

        {/* ── Tab bar ── */}
        <div className="flex rounded-xl bg-zinc-900 border border-zinc-800 p-1 gap-1">
          <button
            onClick={() => setTab('report')}
            className={`flex-1 h-10 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'report'
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-500 active:text-zinc-300'
            }`}
          >
            Report
          </button>
          <button
            onClick={() => setTab('feed')}
            className={`flex-1 h-10 rounded-lg text-sm font-semibold transition-colors relative ${
              tab === 'feed'
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-500 active:text-zinc-300'
            }`}
          >
            Feed
            {recentFeed.length > 0 && (
              <span className="absolute top-1.5 right-3 w-4 h-4 rounded-full bg-[#6b3a1f] text-white text-[10px] flex items-center justify-center">
                {recentFeed.length > 9 ? '9+' : recentFeed.length}
              </span>
            )}
          </button>
        </div>

        {/* ── Tab content ── */}
        {tab === 'report' && (
          <IncidentForm
            prefillRn={selectedRn ?? ''}
            onSubmitted={handleSubmitted}
          />
        )}

        {tab === 'feed' && (
          <FeedView incidents={recentFeed} trains={trains} />
        )}
      </main>
    </div>
  );
}

/* ─── Feed tab ─────────────────────────────────────────────────── */

function FeedView({ incidents, trains }: { incidents: Incident[]; trains: Train[] }) {
  if (incidents.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center gap-2 text-zinc-600">
        <span className="text-3xl">🚊</span>
        <p className="text-sm">No reports in the last hour</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 pb-8">
      <p className="text-xs text-zinc-600">
        {incidents.length} report{incidents.length !== 1 ? 's' : ''} in the last hour
      </p>
      {incidents.map(inc => {
        const polarity = typePolarity(inc.type);
        const train    = trains.find(t => t.rn === inc.runNumber);
        return (
          <div
            key={inc.id}
            className={`px-4 py-4 rounded-xl border ${
              polarity === 'good'
                ? 'bg-green-950/40 border-green-900/60'
                : polarity === 'bad'
                ? 'bg-red-950/40  border-red-900/60'
                : 'bg-zinc-900    border-zinc-800'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                {/* Type badge */}
                <span className={`text-sm font-semibold ${
                  polarity === 'good' ? 'text-green-400' :
                  polarity === 'bad'  ? 'text-red-400'   : 'text-zinc-300'
                }`}>
                  {inc.type}
                </span>
                {/* Comment */}
                <span className="text-base text-zinc-100">"{inc.summary}"</span>
                {/* Train info */}
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className="text-xs font-mono text-zinc-500">
                    run #{inc.runNumber}
                  </span>
                  {inc.carNumber && (
                    <span className="text-xs font-mono text-zinc-500">
                      · car #{inc.carNumber}
                    </span>
                  )}
                  {train && (
                    <span className="text-xs text-zinc-600">
                      · → {train.destNm} · next: {train.nextStaNm}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs text-zinc-600 flex-shrink-0 mt-0.5">
                {timeAgo(inc.timestamp)}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
