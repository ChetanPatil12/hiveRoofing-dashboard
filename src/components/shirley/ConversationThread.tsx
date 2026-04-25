'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { Message } from '@/types/shirley';

function formatRelative(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFull(isoString: string): string {
  return new Date(isoString).toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

const SENDER_BUBBLE: Record<string, string> = {
  shirley: 'bg-blue-500 text-white',
  employee: 'bg-purple-500 text-white',
  homeowner: 'bg-gray-100 text-gray-900',
  subcontractor: 'bg-gray-100 text-gray-900',
};

const SENDER_LABEL: Record<string, string> = {
  shirley: 'Shirley',
  employee: 'You',
  homeowner: 'Homeowner',
  subcontractor: 'Sub',
};

interface Props {
  jobId: string;
  phone: string; // filter messages to/from this phone number
  optimisticMessages?: Message[];
}

export default function ConversationThread({ jobId, phone, optimisticMessages = [] }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const qs = phone ? `?phone=${encodeURIComponent(phone)}` : '';
      const res = await fetch(`/api/shirley/jobs/${jobId}/messages${qs}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages(data.messages ?? []);
    } finally {
      setLoading(false);
    }
  }, [jobId, phone]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    fetchMessages();
    const interval = setInterval(fetchMessages, 15_000);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  const pendingOptimistic = optimisticMessages.filter(
    (opt) => !messages.some(
      (m) => m.message_body === opt.message_body && m.direction === opt.direction && m.sender_type === opt.sender_type
    )
  );
  const allMessages = [...messages, ...pendingOptimistic];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages.length]);

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
            <div className="animate-pulse bg-gray-100 rounded-2xl h-10 w-48" />
          </div>
        ))}
      </div>
    );
  }

  if (allMessages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-6">
        <div>
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">No messages yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {allMessages.map((msg) => {
        const isOutbound = msg.direction === 'outbound';
        const bubbleStyle = SENDER_BUBBLE[msg.sender_type] ?? 'bg-gray-100 text-gray-900';
        const isPending = msg.message_id.startsWith('optimistic-');

        return (
          <div key={msg.message_id} className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}>
            <div className="flex items-end gap-1.5 max-w-[78%]">
              {!isOutbound && (
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mb-1">
                  <span className="text-xs font-medium text-gray-600">
                    {SENDER_LABEL[msg.sender_type]?.[0] ?? '?'}
                  </span>
                </div>
              )}
              <div>
                {!isOutbound && (
                  <p className="text-[10px] text-gray-400 mb-0.5 ml-1">
                    {SENDER_LABEL[msg.sender_type] ?? msg.sender_type}
                  </p>
                )}
                <div
                  className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${bubbleStyle} ${
                    isOutbound ? 'rounded-br-sm' : 'rounded-bl-sm'
                  } ${isPending ? 'opacity-60' : ''}`}
                >
                  {msg.message_body}
                </div>
                {msg.ai_intent_classification && !isOutbound && (
                  <p className="text-[10px] text-gray-400 mt-0.5 ml-1">
                    {msg.ai_intent_classification}
                  </p>
                )}
                <p
                  className="text-[10px] text-gray-400 mt-0.5 cursor-default"
                  style={{ textAlign: isOutbound ? 'right' : 'left' }}
                  title={formatFull(msg.timestamp)}
                >
                  {isPending ? 'Sending…' : formatRelative(msg.timestamp)}
                </p>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
