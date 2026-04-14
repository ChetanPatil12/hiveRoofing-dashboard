'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { AccessType, AppointmentType, Subcontractor, AccuLynxJobResult } from '@/types/shirley';

type Language = 'en' | 'es';

interface TradeRow {
  id: string;
  tradeType: string;
  accessType: AccessType;
  appointmentType: AppointmentType;
  subId?: string;
  subcontractor: { name: string; phone: string; language: Language };
  subError?: string;
}

const APPT_TYPES: AppointmentType[] = ['work', 'inspection', 'estimate'];
const ACCESS_TYPES: AccessType[] = ['exterior', 'interior'];

const inputCls =
  'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#e85d04]';
const selectCls =
  'w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#e85d04]';

function tradeRowFromAccuLynx(name: string): TradeRow {
  return {
    id: `trade-${Date.now()}-${Math.random()}`,
    tradeType: name,
    accessType: 'exterior',
    appointmentType: 'work',
    subId: undefined,
    subcontractor: { name: '', phone: '', language: 'en' },
    subError: undefined,
  };
}

function defaultTrade(): TradeRow {
  return tradeRowFromAccuLynx('');
}

export default function ActivationForm({ subsKey = 0 }: { subsKey?: number }) {
  const router = useRouter();

  // Job search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AccuLynxJobResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Job details
  const [address, setAddress] = useState('');
  const [homeownerName, setHomeownerName] = useState('');
  const [homeownerPhone, setHomeownerPhone] = useState('');
  const [homeownerLanguage, setHomeownerLanguage] = useState<Language>('en');
  const [selectedAccuLynxId, setSelectedAccuLynxId] = useState<string | undefined>();
  const [phoneLoading, setPhoneLoading] = useState(false);

  // Trades
  const [trades, setTrades] = useState<TradeRow[]>([defaultTrade()]);

  // Subcontractors — loaded once on mount
  const [allSubs, setAllSubs] = useState<Subcontractor[]>([]);

  // Job notes / measurements
  const [jobNotes, setJobNotes] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all subcontractors on mount and whenever subsKey changes (new sub added)
  useEffect(() => {
    fetch('/api/shirley/subcontractors')
      .then((r) => r.json())
      .then((d) => setAllSubs(d.subcontractors ?? []))
      .catch(() => {});
  }, [subsKey]);

  // ── AccuLynx search ──────────────────────────────────────────────────────────

  async function handleSearch() {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);
    setShowDropdown(false);
    try {
      const res = await fetch(`/api/shirley/acculynx/jobs?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Search failed');
      const jobs: AccuLynxJobResult[] = data.jobs ?? [];
      setSearchResults(jobs);
      setShowDropdown(true);
      if (jobs.length === 0) setSearchError('No jobs found — try a different address or name.');
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleSelectJob(job: AccuLynxJobResult) {
    setShowDropdown(false);
    setSearchQuery(job.address.fullAddress);
    setAddress(job.address.fullAddress);
    setSelectedAccuLynxId(job.id);

    // Pre-fill name if embedded in response
    if (job.homeownerName) setHomeownerName(job.homeownerName);

    // Auto-create trade rows from AccuLynx tradeTypes
    if (job.tradeTypes && job.tradeTypes.length > 0) {
      setTrades(job.tradeTypes.map((t) => tradeRowFromAccuLynx(t.name)));
    }

    // Fetch phone in background
    setPhoneLoading(true);
    try {
      const qs = new URLSearchParams();
      if (job.contactId) qs.set('contactId', job.contactId);
      if (job.phoneNumberId) qs.set('phoneNumberId', job.phoneNumberId);
      const res = await fetch(`/api/shirley/acculynx/jobs/${job.id}/contact?${qs.toString()}`);
      const data = await res.json();
      if (data.name && !job.homeownerName) setHomeownerName(data.name);
      if (data.phone) setHomeownerPhone(data.phone);
    } catch {
      // non-fatal
    } finally {
      setPhoneLoading(false);
    }
  }

  // ── PDF upload ───────────────────────────────────────────────────────────────

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-uploaded if needed
    e.target.value = '';
    setPdfLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/shirley/extract-pdf', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'PDF extraction failed');
      setJobNotes((prev) =>
        prev ? `${prev}\n\n--- From ${file.name} ---\n${data.text}` : data.text
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract PDF');
    } finally {
      setPdfLoading(false);
    }
  }

  // ── Trade helpers ────────────────────────────────────────────────────────────

  function updateTrade(id: string, patch: Partial<TradeRow>) {
    setTrades((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function handleSelectSub(tradeId: string, subId: string) {
    const sub = allSubs.find((s) => s.sub_id === subId);
    if (!sub) {
      updateTrade(tradeId, { subId: undefined, subcontractor: { name: '', phone: '', language: 'en' } });
      return;
    }
    updateTrade(tradeId, {
      subId: sub.sub_id,
      subcontractor: {
        name: sub.name,
        phone: sub.phone,
        language: (sub.language as Language) ?? 'en',
      },
      subError: undefined,
    });
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

    let hasSubError = false;
    setTrades((prev) =>
      prev.map((t) => {
        if (!t.subcontractor.name.trim() || !t.subcontractor.phone.trim()) {
          hasSubError = true;
          return { ...t, subError: 'Select a subcontractor.' };
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
        homeowner: { name: homeownerName.trim(), phone: homeownerPhone.trim(), language: homeownerLanguage },
        trades: trades.map(({ id: _id, subError: _e, ...t }) => t),
        jobNotes: jobNotes.trim() || undefined,
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
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Job details</h2>

        {/* AccuLynx search */}
        <div>
          <label className="text-[10px] text-gray-400 block mb-1">Search AccuLynx</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(false);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearch(); } }}
                placeholder="Search by address or homeowner name…"
                className={inputCls}
              />
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  {searchResults.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleSelectJob(r)}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 border-b border-gray-100 last:border-0"
                    >
                      {r.homeownerName && (
                        <div className="font-medium text-gray-800">{r.homeownerName}</div>
                      )}
                      {r.tradeTypes && r.tradeTypes.length > 0 && (
                        <div className="text-xs text-[#e85d04] font-medium">{r.tradeTypes.map((t) => t.name).join(' · ')}</div>
                      )}
                      <div className="text-xs text-gray-400">{r.address.fullAddress}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleSearch}
              disabled={searchLoading || !searchQuery.trim()}
              className="px-4 py-2 bg-[#e85d04] hover:bg-[#d05203] disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap"
            >
              {searchLoading ? <Spinner /> : null}
              {searchLoading ? 'Searching…' : 'Search'}
            </button>
          </div>
          {searchError && <p className="text-xs text-red-600 mt-1.5">{searchError}</p>}
        </div>

        {/* Homeowner fields — shown once a job is selected */}
        {address && (
          <div className="space-y-3 pt-1 border-t border-gray-100">
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Property address</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">Homeowner name</label>
                <input value={homeownerName} onChange={(e) => setHomeownerName(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">
                  Phone {phoneLoading && <span className="text-gray-400">(loading…)</span>}
                </label>
                <input value={homeownerPhone} onChange={(e) => setHomeownerPhone(e.target.value)} placeholder="+1…" className={inputCls} />
              </div>
            </div>
            <LangToggle value={homeownerLanguage} onChange={setHomeownerLanguage} label="Homeowner language" />
          </div>
        )}
      </div>

      {/* Trades */}
      {address && (
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
                <span className="text-xs font-semibold text-gray-700">
                  {trade.tradeType || `Trade ${idx + 1}`}
                </span>
                {trades.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setTrades((prev) => prev.filter((t) => t.id !== trade.id))}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>

              {/* Access type + Appointment type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Access</label>
                  <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                    {ACCESS_TYPES.map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => updateTrade(trade.id, { accessType: a })}
                        className={`flex-1 text-xs py-1.5 capitalize transition-colors ${
                          trade.accessType === a
                            ? 'bg-[#e85d04] text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Appointment type</label>
                  <select
                    value={trade.appointmentType}
                    onChange={(e) => updateTrade(trade.id, { appointmentType: e.target.value as AppointmentType })}
                    className={selectCls}
                  >
                    {APPT_TYPES.map((t) => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subcontractor */}
              <div>
                <label className="text-[10px] text-gray-400 block mb-1">Subcontractor</label>
                <select
                  value={trade.subId ?? ''}
                  onChange={(e) => handleSelectSub(trade.id, e.target.value)}
                  className={selectCls}
                >
                  <option value="">Select subcontractor…</option>
                  {allSubs.map((s) => (
                    <option key={s.sub_id} value={s.sub_id}>
                      {s.name}{s.trades_handled?.length ? ` · ${s.trades_handled.join(', ')}` : ''}
                    </option>
                  ))}
                </select>

                {/* Phone + Language — auto-filled, still editable */}
                {trade.subcontractor.name && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-1">Phone</label>
                      <input
                        value={trade.subcontractor.phone}
                        onChange={(e) =>
                          updateTrade(trade.id, {
                            subId: undefined,
                            subcontractor: { ...trade.subcontractor, phone: e.target.value },
                          })
                        }
                        placeholder="+1…"
                        className={inputCls}
                      />
                    </div>
                    <div className="flex items-end pb-0.5">
                      <LangToggle
                        value={trade.subcontractor.language}
                        onChange={(l) =>
                          updateTrade(trade.id, {
                            subcontractor: { ...trade.subcontractor, language: l },
                          })
                        }
                        label="Sub language"
                      />
                    </div>
                  </div>
                )}

                {trade.subError && (
                  <p className="text-xs text-red-600 mt-1.5">{trade.subError}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Job notes & measurements */}
      {address && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">Job Notes & Measurements</h2>
          <p className="text-[11px] text-gray-400">
            Add measurements, scope notes, or upload an EagleView / hover report. Shirley will use this to answer questions about the job.
          </p>
          <textarea
            value={jobNotes}
            onChange={(e) => setJobNotes(e.target.value)}
            placeholder="e.g. Repair only. 22 squares. Hip roof. GAF shingles."
            rows={4}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-[#e85d04]"
          />
          <div className="flex items-center gap-3">
            <label className={`cursor-pointer text-xs font-medium transition-colors ${pdfLoading ? 'text-gray-400 pointer-events-none' : 'text-[#e85d04] hover:underline'}`}>
              {pdfLoading ? 'Extracting PDF…' : '+ Upload PDF (EagleView, hover report)'}
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handlePdfUpload}
                disabled={pdfLoading}
              />
            </label>
            {pdfLoading && <Spinner />}
            {jobNotes && !pdfLoading && (
              <span className="text-[11px] text-gray-400">{jobNotes.length} chars</span>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {address && (
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-[#e85d04] hover:bg-[#d05203] disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <Spinner />
              Coordinating…
            </>
          ) : (
            'Begin Coordination'
          )}
        </button>
      )}
    </form>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
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
          <button
            key={l}
            type="button"
            onClick={() => onChange(l)}
            className={`px-3 py-1 text-xs font-medium uppercase transition-colors ${
              value === l ? 'bg-[#e85d04] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
