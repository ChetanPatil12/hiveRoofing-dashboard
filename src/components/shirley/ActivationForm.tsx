'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { AccessType, AppointmentType, Subcontractor } from '@/types/shirley';

type Language = 'en' | 'es';
type Mode = 'search' | 'manual';

interface TradeRow {
  id: string;
  tradeType: string;
  accessType: AccessType;
  appointmentType: AppointmentType;
  subId?: string;
  subQuery: string;
  subResults: Subcontractor[];
  subSearchLoading: boolean;
  subcontractor: { name: string; phone: string; language: Language };
  subError?: string;
}

interface AccuLynxResult {
  id: string;
  address: { fullAddress: string };
}

const TRADE_TYPES = ['Roofing', 'Gutters', 'Siding', 'Windows', 'Other'];
const ACCESS_TYPES: AccessType[] = ['exterior', 'interior'];
const APPT_TYPES: AppointmentType[] = ['work', 'inspection', 'estimate'];

const inputCls =
  'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#e85d04]';
const selectCls =
  'w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#e85d04]';

function defaultTrade(): TradeRow {
  return {
    id: `trade-${Date.now()}-${Math.random()}`,
    tradeType: 'roofing',
    accessType: 'exterior',
    appointmentType: 'work',
    subId: undefined,
    subQuery: '',
    subResults: [],
    subSearchLoading: false,
    subcontractor: { name: '', phone: '', language: 'en' },
    subError: undefined,
  };
}

export default function ActivationForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AccuLynxResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [address, setAddress] = useState('');
  const [homeownerName, setHomeownerName] = useState('');
  const [homeownerPhone, setHomeownerPhone] = useState('');
  const [language, setLanguage] = useState<Language>('en');
  const [selectedAccuLynxId, setSelectedAccuLynxId] = useState<string | undefined>();

  const [trades, setTrades] = useState<TradeRow[]>([defaultTrade()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const jobDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subDebounceRefs = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ── AccuLynx job search ──────────────────────────────────────────────────────

  const handleJobSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (jobDebounceRef.current) clearTimeout(jobDebounceRef.current);
    if (!q.trim()) { setSearchResults([]); return; }
    jobDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/shirley/acculynx/jobs?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setSearchResults(data.jobs ?? []);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, []);

  async function handleSelectJob(job: AccuLynxResult) {
    setAddress(job.address.fullAddress);
    setSelectedAccuLynxId(job.id);
    setSearchQuery(job.address.fullAddress);
    setSearchResults([]);
    try {
      const res = await fetch(`/api/shirley/acculynx/jobs/${job.id}/contact`);
      const data = await res.json();
      if (data.name) setHomeownerName(data.name);
      if (data.phone) setHomeownerPhone(data.phone);
    } catch {
      // non-fatal
    }
  }

  // ── Subcontractor search (per trade) ────────────────────────────────────────

  function handleSubSearch(tradeId: string, q: string) {
    // Update the query text + clear any prior selection
    setTrades((prev) =>
      prev.map((t) =>
        t.id === tradeId
          ? { ...t, subQuery: q, subId: undefined, subcontractor: { ...t.subcontractor, name: q }, subError: undefined }
          : t
      )
    );

    if (subDebounceRefs.current[tradeId]) clearTimeout(subDebounceRefs.current[tradeId]);

    if (!q.trim()) {
      setTrades((prev) =>
        prev.map((t) => (t.id === tradeId ? { ...t, subResults: [] } : t))
      );
      return;
    }

    subDebounceRefs.current[tradeId] = setTimeout(async () => {
      setTrades((prev) =>
        prev.map((t) => (t.id === tradeId ? { ...t, subSearchLoading: true } : t))
      );
      try {
        const res = await fetch(`/api/shirley/subcontractors?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setTrades((prev) =>
          prev.map((t) =>
            t.id === tradeId
              ? { ...t, subResults: data.subcontractors ?? [], subSearchLoading: false }
              : t
          )
        );
      } catch {
        setTrades((prev) =>
          prev.map((t) => (t.id === tradeId ? { ...t, subSearchLoading: false } : t))
        );
      }
    }, 300);
  }

  function handleSelectSub(tradeId: string, sub: Subcontractor) {
    setTrades((prev) =>
      prev.map((t) =>
        t.id === tradeId
          ? {
              ...t,
              subId: sub.sub_id,
              subQuery: sub.name,
              subResults: [],
              subcontractor: {
                name: sub.name,
                phone: sub.phone,
                language: (sub.language as Language) ?? 'en',
              },
              subError: undefined,
            }
          : t
      )
    );
  }

  // ── Trade field helpers ──────────────────────────────────────────────────────

  function updateTrade(id: string, patch: Partial<TradeRow>) {
    setTrades((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function updateSubField(id: string, patch: Partial<TradeRow['subcontractor']>) {
    setTrades((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, subcontractor: { ...t.subcontractor, ...patch } } : t
      )
    );
  }

  function removeTrade(id: string) {
    setTrades((prev) => prev.filter((t) => t.id !== id));
  }

  // ── Submit ───────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!address.trim() || !homeownerName.trim() || !homeownerPhone.trim()) {
      setError('Property address, homeowner name, and phone are required.');
      return;
    }
    if (trades.length === 0) {
      setError('Add at least one trade.');
      return;
    }

    // Validate sub per trade and mark inline errors
    let hasSubError = false;
    setTrades((prev) =>
      prev.map((t) => {
        if (!t.subcontractor.name.trim() || !t.subcontractor.phone.trim()) {
          hasSubError = true;
          return { ...t, subError: 'Subcontractor name and phone are required.' };
        }
        return { ...t, subError: undefined };
      })
    );
    if (hasSubError) return;

    setSubmitting(true);
    try {
      const payload = {
        acculynxJobId: selectedAccuLynxId,
        propertyAddress: address.trim(),
        homeowner: { name: homeownerName.trim(), phone: homeownerPhone.trim(), language },
        trades: trades.map(({ id: _id, subQuery: _q, subResults: _r, subSearchLoading: _l, subError: _e, ...t }) => t),
      };

      const res = await fetch('/api/shirley/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);

      const jobId = data.jobId ?? data.job_id;
      router.push(jobId ? `/shirley/inbox/${jobId}` : '/shirley/inbox');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start job — please try again');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
      {/* Job details */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Job details</h2>
        <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-4 w-fit">
          {(['search', 'manual'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                mode === m ? 'bg-[#e85d04] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {m === 'search' ? 'Search AccuLynx' : 'Enter manually'}
            </button>
          ))}
        </div>

        {mode === 'search' ? (
          <div className="space-y-3">
            <div className="relative">
              <input
                value={searchQuery}
                onChange={(e) => handleJobSearch(e.target.value)}
                placeholder="Search AccuLynx by address…"
                className={inputCls}
              />
              {searchLoading && <SpinnerIcon />}
              {searchResults.length > 0 && (
                <DropdownList>
                  {searchResults.map((r) => (
                    <DropdownItem key={r.id} onClick={() => handleSelectJob(r)}>
                      {r.address.fullAddress}
                    </DropdownItem>
                  ))}
                </DropdownList>
              )}
            </div>
            {address && (
              <div className="space-y-3 pt-1">
                <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Property address" className={inputCls} />
                <div className="grid grid-cols-2 gap-3">
                  <input value={homeownerName} onChange={(e) => setHomeownerName(e.target.value)} placeholder="Homeowner name" className={inputCls} />
                  <input value={homeownerPhone} onChange={(e) => setHomeownerPhone(e.target.value)} placeholder="Homeowner phone" className={inputCls} />
                </div>
                <LangToggle value={language} onChange={setLanguage} />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Property address" className={inputCls} />
            <div className="grid grid-cols-2 gap-3">
              <input value={homeownerName} onChange={(e) => setHomeownerName(e.target.value)} placeholder="Homeowner name" className={inputCls} />
              <input value={homeownerPhone} onChange={(e) => setHomeownerPhone(e.target.value)} placeholder="Homeowner phone" className={inputCls} />
            </div>
            <LangToggle value={language} onChange={setLanguage} />
          </div>
        )}
      </div>

      {/* Trades */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Trades</h2>
          <button
            type="button"
            onClick={() => setTrades((prev) => [...prev, defaultTrade()])}
            className="text-xs text-[#e85d04] font-medium hover:underline"
          >
            + Add trade
          </button>
        </div>

        {trades.map((trade, idx) => (
          <div key={trade.id} className="border border-gray-100 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Trade {idx + 1}</span>
              {trades.length > 1 && (
                <button type="button" onClick={() => removeTrade(trade.id)} className="text-xs text-red-500 hover:underline">
                  Remove
                </button>
              )}
            </div>

            {/* Trade type / access / appointment */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">Type</label>
                <select value={trade.tradeType} onChange={(e) => updateTrade(trade.id, { tradeType: e.target.value })} className={selectCls}>
                  {TRADE_TYPES.map((t) => <option key={t} value={t.toLowerCase()}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">Access</label>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                  {ACCESS_TYPES.map((a) => (
                    <button key={a} type="button" onClick={() => updateTrade(trade.id, { accessType: a })}
                      className={`flex-1 text-xs py-1.5 capitalize transition-colors ${trade.accessType === a ? 'bg-[#e85d04] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">Appointment</label>
                <select value={trade.appointmentType} onChange={(e) => updateTrade(trade.id, { appointmentType: e.target.value as AppointmentType })} className={selectCls}>
                  {APPT_TYPES.map((t) => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
            </div>

            {/* Subcontractor */}
            <div className="pt-1">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-[10px] text-gray-400 font-medium">SUBCONTRACTOR</p>
                {trade.subId && (
                  <span className="text-[10px] bg-green-50 text-green-700 border border-green-200 rounded px-1.5 py-0.5 font-medium">
                    existing
                  </span>
                )}
              </div>

              {/* Sub name search */}
              <div className="relative mb-2">
                <input
                  value={trade.subQuery}
                  onChange={(e) => handleSubSearch(trade.id, e.target.value)}
                  placeholder="Search by name or type new sub name…"
                  className={inputCls}
                />
                {trade.subSearchLoading && <SpinnerIcon />}
                {trade.subResults.length > 0 && (
                  <DropdownList>
                    {trade.subResults.map((s) => (
                      <DropdownItem key={s.sub_id} onClick={() => handleSelectSub(trade.id, s)}>
                        <span className="font-medium">{s.name}</span>
                        <span className="text-gray-400 ml-2 text-xs">{s.phone}</span>
                        {s.trades_handled?.length > 0 && (
                          <span className="text-gray-400 ml-2 text-xs">· {s.trades_handled.join(', ')}</span>
                        )}
                      </DropdownItem>
                    ))}
                  </DropdownList>
                )}
              </div>

              {/* Sub phone + language — always visible for confirmation or override */}
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={trade.subcontractor.phone}
                  onChange={(e) => {
                    updateTrade(trade.id, { subId: undefined });
                    updateSubField(trade.id, { phone: e.target.value });
                  }}
                  placeholder="Sub phone"
                  className={inputCls}
                />
                <div className="flex items-center">
                  <LangToggle
                    value={trade.subcontractor.language}
                    onChange={(l) => updateSubField(trade.id, { language: l })}
                    label="Sub lang"
                  />
                </div>
              </div>

              {trade.subError && (
                <p className="text-xs text-red-600 mt-1.5">{trade.subError}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-[#e85d04] hover:bg-[#d05203] disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Starting job…
          </>
        ) : (
          'Start Job'
        )}
      </button>
    </form>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SpinnerIcon() {
  return (
    <svg className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function DropdownList({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
      {children}
    </div>
  );
}

function DropdownItem({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 border-b border-gray-100 last:border-0 flex items-center"
    >
      {children}
    </button>
  );
}

function LangToggle({
  value,
  onChange,
  label = 'Language',
}: {
  value: Language;
  onChange: (l: Language) => void;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-gray-400">{label}:</span>
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        {(['en', 'es'] as Language[]).map((l) => (
          <button key={l} type="button" onClick={() => onChange(l)}
            className={`px-3 py-1 text-xs font-medium uppercase transition-colors ${value === l ? 'bg-[#e85d04] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
