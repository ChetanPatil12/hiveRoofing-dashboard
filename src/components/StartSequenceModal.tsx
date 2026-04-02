'use client';

import { useState, useEffect, useRef } from 'react';

interface AccuLynxAddress {
  street1?: string;
  city?: string;
  state?: { abbreviation?: string; name?: string };
  zipCode?: string;
}

interface AccuLynxContactPerson {
  firstName?: string;
  lastName?: string;
}

interface AccuLynxContact {
  contact?: AccuLynxContactPerson;
  isPrimary?: boolean;
}

interface AccuLynxJob {
  id: string;
  jobNumber: string;
  jobName: string;
  currentMilestone: string;
  locationAddress?: AccuLynxAddress;
  contacts?: AccuLynxContact[];
}

type ModalState = 'search' | 'confirm' | 'loading' | 'success' | 'error';

interface Props {
  onClose: () => void;
}

function formatAddress(addr?: AccuLynxAddress): string {
  if (!addr) return '—';
  return [addr.street1, addr.city, addr.state?.abbreviation, addr.zipCode]
    .filter(Boolean)
    .join(', ');
}

function primaryContact(contacts?: AccuLynxContact[]): string {
  if (!contacts?.length) return '—';
  const primary = contacts.find((c) => c.isPrimary) ?? contacts[0];
  const c = primary.contact;
  if (!c) return '—';
  return [c.firstName, c.lastName].filter(Boolean).join(' ') || '—';
}

const MILESTONE_STYLE: Record<string, string> = {
  Lead: 'bg-gray-100 text-gray-600',
  Prospect: 'bg-blue-100 text-blue-700',
  Approved: 'bg-purple-100 text-purple-700',
  Completed: 'bg-green-100 text-green-700',
  Invoiced: 'bg-yellow-100 text-yellow-700',
  Closed: 'bg-orange-100 text-orange-700',
  Cancelled: 'bg-red-100 text-red-700',
};

export default function StartSequenceModal({ onClose }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AccuLynxJob[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<AccuLynxJob | null>(null);
  const [modalState, setModalState] = useState<ModalState>('search');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitError, setSubmitError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    setResults([]);
    setSelectedJob(null);
    try {
      const res = await fetch('/api/acculynx/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchTerm: query }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setResults(data.items ?? []);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  }

  function handleSelectJob(job: AccuLynxJob) {
    setSelectedJob(job);
    setModalState('confirm');
  }

  function handleBack() {
    setSelectedJob(null);
    setModalState('search');
  }

  async function handleConfirm() {
    if (!selectedJob) return;
    setModalState('loading');
    try {
      const res = await fetch('/api/start-sequence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: selectedJob.id,
          jobNumber: selectedJob.jobNumber,
          jobName: selectedJob.jobName,
          milestone: selectedJob.currentMilestone,
          address: selectedJob.locationAddress,
          contacts: selectedJob.contacts,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      setSuccessMessage(data.message ?? 'Review sequence started successfully.');
      setModalState('success');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to start sequence');
      setModalState('error');
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              {modalState === 'confirm' && (
                <button
                  onClick={handleBack}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors mr-1"
                  aria-label="Back to search"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <div className="w-7 h-7 rounded-lg bg-[#e85d04] flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h2 className="text-base font-bold text-gray-900">
                {modalState === 'confirm' ? 'Confirm Review Sequence' : 'Start Review Sequence'}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto">

            {/* ── Search state ── */}
            {(modalState === 'search') && (
              <div className="p-5">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      ref={inputRef}
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search by job name or address…"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#e85d04] focus:border-transparent"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={searching || !query.trim()}
                    className="px-4 py-2.5 bg-[#e85d04] text-white text-sm font-medium rounded-lg hover:bg-[#d05203] disabled:opacity-50 transition-colors flex-shrink-0"
                  >
                    {searching ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    ) : 'Search'}
                  </button>
                </form>

                {/* Search error */}
                {searchError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-start gap-2">
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {searchError}
                  </div>
                )}

                {/* Results */}
                {results.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs text-gray-400 mb-2">
                      {results.length} result{results.length !== 1 ? 's' : ''} — click a job to start its sequence
                    </p>
                    {results.map((job) => (
                      <button
                        key={job.id}
                        onClick={() => handleSelectJob(job)}
                        className="w-full text-left p-3.5 border border-gray-200 rounded-xl hover:border-[#e85d04] hover:bg-orange-50 transition-colors group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm text-gray-900 group-hover:text-[#e85d04] transition-colors">
                                {job.jobName || '(Unnamed job)'}
                              </span>
                              {job.jobNumber && (
                                <span className="text-xs text-gray-400">#{job.jobNumber}</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                              {formatAddress(job.locationAddress)}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {primaryContact(job.contacts)}
                            </p>
                          </div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${MILESTONE_STYLE[job.currentMilestone] ?? 'bg-gray-100 text-gray-600'}`}>
                            {job.currentMilestone}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* No results */}
                {!searching && results.length === 0 && query && !searchError && (
                  <p className="mt-6 text-center text-sm text-gray-400">No jobs found for &ldquo;{query}&rdquo;</p>
                )}

                {/* Empty prompt */}
                {!searching && results.length === 0 && !query && (
                  <p className="mt-6 text-center text-sm text-gray-400">
                    Search for a job by name or address to get started.
                  </p>
                )}
              </div>
            )}

            {/* ── Confirm state ── */}
            {modalState === 'confirm' && selectedJob && (
              <div className="p-5">
                <p className="text-sm text-gray-500 mb-4">
                  You&apos;re about to start a review request sequence for this job:
                </p>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-gray-900">{selectedJob.jobName || '(Unnamed job)'}</p>
                      {selectedJob.jobNumber && (
                        <p className="text-xs text-gray-400 mt-0.5">Job #{selectedJob.jobNumber}</p>
                      )}
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${MILESTONE_STYLE[selectedJob.currentMilestone] ?? 'bg-gray-100 text-gray-600'}`}>
                      {selectedJob.currentMilestone}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 space-y-1">
                    <div className="flex gap-2">
                      <span className="text-gray-400 w-16 flex-shrink-0">Address</span>
                      <span>{formatAddress(selectedJob.locationAddress)}</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-gray-400 w-16 flex-shrink-0">Name</span>
                      <span>{primaryContact(selectedJob.contacts)}</span>
                    </div>
                  </div>
                </div>
                <p className="mt-4 text-xs text-gray-400">
                  This will add the customer to the review request automation sequence.
                </p>
              </div>
            )}

            {/* ── Loading state ── */}
            {modalState === 'loading' && (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-10 h-10 border-4 border-[#e85d04] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-400">Starting review sequence…</p>
              </div>
            )}

            {/* ── Success state ── */}
            {modalState === 'success' && (
              <div className="flex flex-col items-center justify-center py-14 px-5 gap-4 text-center">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-base">Sequence Started</p>
                  <p className="text-sm text-gray-500 mt-1">{successMessage}</p>
                </div>
                <button
                  onClick={onClose}
                  className="mt-2 px-5 py-2 bg-[#e85d04] text-white text-sm font-medium rounded-lg hover:bg-[#d05203] transition-colors"
                >
                  Done
                </button>
              </div>
            )}

            {/* ── Error state ── */}
            {modalState === 'error' && (
              <div className="flex flex-col items-center justify-center py-14 px-5 gap-4 text-center">
                <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-7 h-7 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-base">Something went wrong</p>
                  <p className="text-sm text-gray-500 mt-1">{submitError}</p>
                </div>
                <button
                  onClick={() => setModalState('confirm')}
                  className="mt-2 px-5 py-2 bg-[#e85d04] text-white text-sm font-medium rounded-lg hover:bg-[#d05203] transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>

          {/* Footer — confirm action */}
          {modalState === 'confirm' && (
            <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={handleBack}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-2.5 bg-[#e85d04] text-white text-sm font-medium rounded-lg hover:bg-[#d05203] transition-colors"
              >
                Start Sequence
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
