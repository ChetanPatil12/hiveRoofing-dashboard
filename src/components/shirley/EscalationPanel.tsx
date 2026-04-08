'use client';

import { useRouter } from 'next/navigation';
import type { Escalation } from '@/types/shirley';

function formatRelative(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const SEVERITY_BADGE: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-600',
};

interface Props {
  escalations: Escalation[];
  onClose: () => void;
  onResolve: (id: string) => void;
}

export default function EscalationPanel({ escalations, onClose, onResolve }: Props) {
  const router = useRouter();

  async function handleResolve(id: string) {
    try {
      await fetch(`/api/shirley/escalations/${id}/resolve`, { method: 'POST' });
      onResolve(id);
    } catch {
      // silently fail — badge will correct on next poll
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      {/* Panel */}
      <aside className="fixed right-0 top-0 h-full w-full max-w-[400px] bg-white shadow-2xl z-50 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">Flagged for Review</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {escalations.length === 0
                ? 'All clear'
                : `${escalations.length} conversation${escalations.length !== 1 ? 's' : ''} need attention`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {escalations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mb-2">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700">No flagged conversations</p>
              <p className="text-xs text-gray-400 mt-1">Shirley is handling everything</p>
            </div>
          ) : (
            escalations.map((e) => (
              <div key={e.escalation_id} className="bg-white border border-gray-200 rounded-xl p-3.5">
                <div className="flex items-start justify-between gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${SEVERITY_BADGE[e.severity] ?? 'bg-gray-100 text-gray-600'}`}>
                    {e.severity.toUpperCase()}
                  </span>
                  <span className="text-[10px] text-gray-400">{formatRelative(e.created_at)}</span>
                </div>
                {e.property_address && (
                  <p className="text-xs font-medium text-gray-900 mt-2">{e.property_address}</p>
                )}
                {e.reason && (
                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">{e.reason}</p>
                )}
                {e.message_body && (
                  <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 italic">"{e.message_body}"</p>
                )}
                <div className="flex items-center gap-2 mt-3">
                  {e.job_id && (
                    <button
                      onClick={() => {
                        onClose();
                        router.push(`/shirley/inbox/${e.job_id}`);
                      }}
                      className="flex-1 text-xs text-center py-1.5 border border-[#e85d04] text-[#e85d04] rounded-lg hover:bg-orange-50 transition-colors font-medium"
                    >
                      View conversation
                    </button>
                  )}
                  <button
                    onClick={() => handleResolve(e.escalation_id)}
                    className="flex-1 text-xs text-center py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Mark resolved
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
}
