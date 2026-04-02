'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Customer, CustomerStatus } from '@/types/customer';
import SummaryCards from './SummaryCards';
import CustomerTable from './CustomerTable';
import DetailPanel from './DetailPanel';
import AnalyticsSection from './analytics/AnalyticsSection';
import StartSequenceModal from './StartSequenceModal';

type StatusFilter = CustomerStatus | 'all';

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'negative_feedback', label: 'Negative Feedback' },
  { value: 'opted_out', label: 'Opted Out' },
];

export default function Dashboard() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);

  const fetchData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch('/api/sheet');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setCustomers(data.customers ?? []);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 60_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const selectedCustomer = customers.find((c) => c.customer_id === selectedId) ?? null;

  const filtered = customers.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      c.customer_name.toLowerCase().includes(q) ||
      c.customer_email.toLowerCase().includes(q) ||
      c.customer_address.toLowerCase().includes(q) ||
      c.customer_id.toLowerCase().includes(q) ||
      c.job_id.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Brand mark */}
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#e85d04] flex-shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-gray-900 leading-tight truncate">
                Hive Roofing &amp; Solar
              </h1>
              <p className="text-xs text-gray-400 leading-tight">
                Review Request Dashboard
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            {lastRefresh && (
              <span className="text-xs text-gray-400 hidden sm:block">
                Updated {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={() => setShowStartModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-[#e85d04] text-[#e85d04] rounded-lg hover:bg-orange-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Start Sequence
            </button>
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-[#e85d04] text-white rounded-lg hover:bg-[#d05203] disabled:opacity-60 transition-colors"
            >
              <svg
                className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main
        className={`max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 transition-all duration-200 ${
          selectedCustomer ? 'pr-4 sm:pr-[500px]' : ''
        }`}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="w-10 h-10 border-4 border-[#e85d04] border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Loading review data…</p>
          </div>
        ) : error ? (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-medium text-red-700">Failed to load data</p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
                {error.includes('GOOGLE_SHEETS_API_KEY') && (
                  <p className="text-sm text-red-500 mt-2">
                    Set <code className="bg-red-100 px-1 rounded">GOOGLE_SHEETS_API_KEY</code> in{' '}
                    <code className="bg-red-100 px-1 rounded">.env.local</code> and restart the dev server.
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            <SummaryCards customers={customers} />

            <AnalyticsSection customers={customers} />

            {/* ── Filters ── */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by name, email, address, or ID…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#e85d04] focus:border-transparent"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#e85d04]"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Result count */}
            <p className="mt-3 text-xs text-gray-400">
              Showing{' '}
              <span className="font-semibold text-gray-600">{filtered.length}</span>{' '}
              of{' '}
              <span className="font-semibold text-gray-600">{customers.length}</span>{' '}
              customers
            </p>

            <CustomerTable
              customers={filtered}
              onSelectCustomer={(c) => setSelectedId(c.customer_id)}
              selectedId={selectedId ?? undefined}
            />
          </>
        )}
      </main>

      {/* ── Detail panel ── */}
      {selectedCustomer && (
        <DetailPanel
          customer={selectedCustomer}
          onClose={() => setSelectedId(null)}
        />
      )}

      {/* ── Start sequence modal ── */}
      {showStartModal && (
        <StartSequenceModal onClose={() => setShowStartModal(false)} />
      )}
    </div>
  );
}
