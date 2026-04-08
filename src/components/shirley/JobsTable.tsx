'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Job, Trade, JobStatus } from '@/types/shirley';

type StatusFilter = 'all' | JobStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'scheduling', label: 'Scheduling' },
  { value: 'on_track', label: 'On track' },
  { value: 'needs_attention', label: 'Needs attention' },
];

const STATUS_BADGE: Record<JobStatus, { label: string; className: string }> = {
  scheduling: { label: 'Scheduling', className: 'bg-yellow-100 text-yellow-700' },
  on_track: { label: 'On track', className: 'bg-green-100 text-green-700' },
  needs_attention: { label: 'Needs attention', className: 'bg-red-100 text-red-700' },
};

const TRADE_STATUS_STYLE: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-600',
  scheduling: 'bg-yellow-100 text-yellow-700',
  scheduled: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    timeZone: 'America/Denver',
  });
}

export default function JobsTable() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      const res = await fetch('/api/shirley/jobs');
      if (!res.ok) return;
      const data = await res.json();
      setJobs(data.jobs ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const filtered = jobs.filter(
    (j) => statusFilter === 'all' || j.computed_status === statusFilter
  );

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-1 mb-4">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              statusFilter === f.value
                ? 'bg-[#e85d04] text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-4 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-100 rounded-lg h-12" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700">No jobs found</p>
            <p className="text-xs text-gray-400 mt-1">No active jobs yet — click Start Job to begin</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {['Address', 'Homeowner', 'Trades', 'Status', 'Last Activity', 'Actions'].map((h) => (
                  <th key={h} className="text-left text-xs font-medium text-gray-500 px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((job) => {
                const status = job.computed_status ?? 'on_track';
                const badge = STATUS_BADGE[status];
                const isExpanded = expandedId === job.job_id;
                const trades: Trade[] = job.trades ?? [];

                return [
                  <tr
                    key={job.job_id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : job.job_id)}
                        className="flex items-center gap-1.5 text-left group"
                      >
                        <svg
                          className={`w-3.5 h-3.5 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="font-medium text-gray-900 group-hover:text-[#e85d04] transition-colors">
                          {job.property_address}
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{job.homeowner_name}</td>
                    <td className="px-4 py-3 text-gray-500">{trades.length} trade{trades.length !== 1 ? 's' : ''}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(job.updated_at)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => router.push(`/shirley/inbox/${job.job_id}`)}
                        className="text-xs font-medium text-[#e85d04] hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>,
                  isExpanded && (
                    <tr key={`${job.job_id}-expanded`} className="bg-orange-50/30 border-b border-gray-100">
                      <td colSpan={6} className="px-6 py-3">
                        <div className="space-y-2">
                          {trades.length === 0 ? (
                            <p className="text-xs text-gray-400">No trades added</p>
                          ) : (
                            trades.map((t) => (
                              <div key={t.trade_id} className="flex items-center gap-4 text-xs text-gray-600">
                                <span className="font-medium capitalize w-20">{t.trade_type}</span>
                                <span className="text-gray-400">{t.sub_name ?? '—'}</span>
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${TRADE_STATUS_STYLE[t.status] ?? 'bg-gray-100 text-gray-600'}`}>
                                  {t.status.replace('_', ' ')}
                                </span>
                                <span className="text-gray-400 capitalize">{t.access_type}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  ),
                ].filter(Boolean);
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
