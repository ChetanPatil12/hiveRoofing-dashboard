'use client';

import { useState } from 'react';
import type { Message } from '@/types/shirley';

interface Props {
  jobId: string;
  recipientPhone: string;
  recipientName: string;
  tradeId?: string;
  onMessageSent: (msg: Message) => void;
}

export default function MessageComposer({ jobId, recipientPhone, recipientName, tradeId, onMessageSent }: Props) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend() {
    if (!body.trim() || !recipientPhone) return;
    setError(null);
    setSending(true);

    const optimisticMsg: Message = {
      message_id: `optimistic-${Date.now()}`,
      job_id: jobId,
      trade_id: tradeId ?? null,
      timestamp: new Date().toISOString(),
      direction: 'outbound',
      sender_phone: '',
      recipient_phone: recipientPhone,
      message_body: body.trim(),
      sender_type: 'employee',
      message_type: 'custom',
      ai_intent_classification: null,
      ai_confidence_score: null,
      state_change_triggered: false,
      state_change_details: null,
      created_at: new Date().toISOString(),
    };
    onMessageSent(optimisticMsg);
    setBody('');

    try {
      const res = await fetch('/api/shirley/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          recipientPhone,
          messageBody: optimisticMsg.message_body,
          employeeId: 'staff',
          tradeId,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Error ${res.status}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send message — please try again");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="border-t border-gray-200 bg-white p-3 space-y-2 flex-shrink-0">
      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <div className="flex gap-2 items-end">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message ${recipientName}… (Enter to send)`}
          rows={2}
          className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#e85d04] focus:border-transparent"
        />
        <button
          onClick={handleSend}
          disabled={!body.trim() || sending || !recipientPhone}
          className="flex-shrink-0 w-9 h-9 rounded-xl bg-[#e85d04] hover:bg-[#d05203] disabled:opacity-40 flex items-center justify-center transition-colors"
        >
          {sending ? (
            <svg className="w-4 h-4 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
