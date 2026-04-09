'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Job, Trade, Appointment, Message } from '@/types/shirley';
import ConversationThread from './ConversationThread';
import MessageComposer from './MessageComposer';

interface JobDetailData extends Job {
  trades: Trade[];
  appointments: Appointment[];
}

// Tab can be 'homeowner' or a trade_id
type ActiveTab = 'homeowner' | string;

interface Props {
  jobId: string;
  onClose: () => void;
}

function AppointmentStatus({ appt }: { appt: Appointment | undefined }) {
  if (!appt) return <span className="text-xs text-gray-400">No appointment</span>;
  const time = appt.confirmed_time ?? appt.proposed_time;
  const label = appt.status === 'confirmed' ? 'Confirmed' : appt.status === 'proposed' ? 'Proposed' : appt.status;
  const style =
    appt.status === 'confirmed'
      ? 'bg-green-100 text-green-700'
      : appt.status === 'proposed'
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-gray-100 text-gray-600';
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>{label}</span>
      {time && (
        <span className="text-xs text-gray-500">
          {new Date(time).toLocaleString('en-US', {
            timeZone: 'America/Denver',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })}
        </span>
      )}
    </div>
  );
}

const TRADE_STATUS_STYLE: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-600',
  scheduling: 'bg-yellow-100 text-yellow-700',
  scheduled: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
};

export default function JobDetail({ jobId, onClose }: Props) {
  const [job, setJob] = useState<JobDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('homeowner');
  // Per-tab optimistic messages keyed by phone number
  const [optimisticMessages, setOptimisticMessages] = useState<Record<string, Message[]>>({});

  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/shirley/jobs/${jobId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setJob(data.job);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    setLoading(true);
    setJob(null);
    setOptimisticMessages({});
    setActiveTab('homeowner');
    fetchJob();
  }, [fetchJob]);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  function handleMessageSent(phone: string, msg: Message) {
    setOptimisticMessages((prev) => ({
      ...prev,
      [phone]: [...(prev[phone] ?? []), msg],
    }));
  }

  if (loading) {
    return (
      <aside className="fixed right-0 top-0 h-full w-full max-w-[520px] bg-white shadow-2xl z-30 flex flex-col">
        <div className="p-4 border-b border-gray-200 animate-pulse">
          <div className="h-5 bg-gray-100 rounded w-48 mb-2" />
          <div className="h-4 bg-gray-100 rounded w-32" />
        </div>
        <div className="flex-1 p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
              <div className="animate-pulse bg-gray-100 rounded-2xl h-10 w-44" />
            </div>
          ))}
        </div>
      </aside>
    );
  }

  if (error || !job) {
    return (
      <aside className="fixed right-0 top-0 h-full w-full max-w-[520px] bg-white shadow-2xl z-30 flex flex-col items-center justify-center gap-3 p-6">
        <p className="text-sm text-red-600">{error ?? 'Job not found'}</p>
        <button onClick={onClose} className="text-xs text-gray-500 underline">Close</button>
      </aside>
    );
  }

  const trades = job.trades ?? [];
  const appointments = job.appointments ?? [];

  // Determine active context from tab
  const isHomeownerTab = activeTab === 'homeowner';
  const activeTrade = isHomeownerTab ? null : trades.find((t) => t.trade_id === activeTab) ?? null;
  const tradeAppt = activeTrade ? appointments.find((a) => a.trade_id === activeTrade.trade_id) : undefined;

  // Phone for current tab
  const activePhone = isHomeownerTab ? job.homeowner_phone : (activeTrade?.sub_phone ?? '');
  const activeName = isHomeownerTab ? job.homeowner_name : (activeTrade?.sub_name ?? 'Sub');
  const activeTradeId = isHomeownerTab ? undefined : activeTrade?.trade_id;

  return (
    <aside className="fixed right-0 top-0 h-full w-full max-w-[520px] bg-white shadow-2xl z-30 flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b border-gray-200 flex-shrink-0">
        <div>
          <h2 className="font-semibold text-gray-900 text-sm leading-tight">{job.homeowner_name}</h2>
          <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{job.property_address}</p>
          {job.homeowner_phone && (
            <p className="text-xs text-gray-400">{job.homeowner_phone}</p>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors flex-shrink-0 ml-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tabs: Homeowner + one per trade/sub */}
      <div className="flex-shrink-0 border-b border-gray-200">
        <div className="flex overflow-x-auto">
          {/* Homeowner tab */}
          <button
            onClick={() => setActiveTab('homeowner')}
            className={`px-4 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
              isHomeownerTab
                ? 'border-[#e85d04] text-[#e85d04]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Homeowner
          </button>

          {/* One tab per trade (sub conversation) */}
          {trades.map((trade) => (
            <button
              key={trade.trade_id}
              onClick={() => setActiveTab(trade.trade_id)}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === trade.trade_id
                  ? 'border-[#e85d04] text-[#e85d04]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {trade.trade_type}
            </button>
          ))}
        </div>

        {/* Context bar — shows sub info + status when on a trade tab */}
        {!isHomeownerTab && activeTrade && (
          <div className="px-4 py-2.5 bg-gray-50 text-xs text-gray-600 space-y-1.5">
            <div className="flex items-center gap-3">
              <span className="text-gray-400">Sub:</span>
              <span className="font-medium">{activeTrade.sub_name ?? '—'}</span>
              {activeTrade.sub_phone && <span className="text-gray-400">{activeTrade.sub_phone}</span>}
              <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TRADE_STATUS_STYLE[activeTrade.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {activeTrade.status.replace('_', ' ')}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-400">Access:</span>
              <span className="capitalize">{activeTrade.access_type}</span>
              <span className="text-gray-400 ml-3">Appointment:</span>
              <AppointmentStatus appt={tradeAppt} />
            </div>
          </div>
        )}
      </div>

      {/* Conversation — scoped to active tab's phone */}
      <ConversationThread
        key={activePhone} // remount when tab changes so it resets scroll and messages
        jobId={jobId}
        phone={activePhone}
        optimisticMessages={optimisticMessages[activePhone] ?? []}
      />

      {/* Composer — sends to whoever's tab is active */}
      {activePhone ? (
        <MessageComposer
          jobId={jobId}
          recipientPhone={activePhone}
          recipientName={activeName}
          tradeId={activeTradeId}
          onMessageSent={(msg) => handleMessageSent(activePhone, msg)}
        />
      ) : (
        <div className="border-t border-gray-200 p-3 text-xs text-gray-400 text-center flex-shrink-0">
          No phone number on file for this subcontractor
        </div>
      )}
    </aside>
  );
}
