'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { Job, JobStatus } from '@/types/shirley';

function formatRelative(isoString: string | null | undefined): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const STATUS_BADGE: Record<JobStatus, { label: string; className: string }> = {
  scheduling: { label: 'Scheduling', className: 'bg-yellow-100 text-yellow-700' },
  on_track: { label: 'On track', className: 'bg-green-100 text-green-700' },
  needs_attention: { label: 'Needs attention', className: 'bg-red-100 text-red-700' },
};

interface Props {
  selectedJobId?: string;
}

export default function JobList({ selectedJobId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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
    const interval = setInterval(fetchJobs, 30_000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const filtered = jobs.filter((j) => {
    const q = search.toLowerCase();
    return (
      !q ||
      j.property_address.toLowerCase().includes(q) ||
      j.homeowner_name.toLowerCase().includes(q)
    );
  });

  function handleSelect(jobId: string) {
    router.push(`/shirley/inbox/${jobId}`);
  }

  return (
    <div className="w-80 flex-shrink-0 border-r border-gray-200 flex flex-col h-full bg-white">
      {/* Search */}
      <div className="p-3 border-b border-gray-200">
        <div className="relative">
          <svg className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs…"
            className="w-full text-sm pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e85d04] focus:border-transparent"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-3 space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-16" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 font-medium">
              {search ? 'No jobs found' : 'No active jobs yet'}
            </p>
            {!search && (
              <p className="text-xs text-gray-400 mt-1">Click "Start Job" to begin</p>
            )}
          </div>
        ) : (
          filtered.map((job) => {
            const status = job.computed_status ?? 'on_track';
            const badge = STATUS_BADGE[status];
            const isSelected = job.job_id === selectedJobId;
            return (
              <button
                key={job.job_id}
                onClick={() => handleSelect(job.job_id)}
                className={`w-full text-left px-4 py-3.5 border-b border-gray-100 transition-colors ${
                  isSelected
                    ? 'bg-orange-50 border-l-2 border-l-[#e85d04]'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900 leading-tight line-clamp-1">
                    {job.property_address}
                  </p>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap flex-shrink-0 ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{job.homeowner_name}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-gray-400">
                    {(job.trades ?? []).length} trade{(job.trades ?? []).length !== 1 ? 's' : ''}
                  </span>
                  {job.last_message_at && (
                    <span className="text-[10px] text-gray-400">{formatRelative(job.last_message_at)}</span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
