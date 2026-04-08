'use client';

import { useState } from 'react';
import type { Trade, Message } from '@/types/shirley';

interface Recipient {
  label: string;
  phone: string;
  tradeId?: string;
}

interface Props {
  jobId: string;
  homeownerPhone: string;
  homeownerName: string;
  trades: Trade[];
  onMessageSent: (msg: Message) => void;
}

export default function MessageComposer({ jobId, homeownerPhone, homeownerName, trades, onMessageSent }: Props) {
  const recipients: Recipient[] = [
    { label: homeownerName || 'Homeowner', phone: homeownerPhone },
    ...trades.map((t) => ({
      label: `${t.sub_name ?? 'Sub'} (${t.trade_type})`,
      phone: t.sub_phone ?? '',
      tradeId: t.trade_id,
    })).filter((r) => r.phone),
  ];

  const [selectedPhone, setSelectedPhone] = useState(recipients[0]?.phone ?? '');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedRecipient = recipients.find((r) => r.phone === selectedPhone);

  async function handleSend() {
    if (!body.trim() || !selectedPhone) return;
    setError(null);
    setSending(true);

    // Optimistic message
    const optimisticMsg: Message = {
      message_id: `optimistic-${Date.now()}`,
      job_id: jobId,
      trade_id: selectedRecipient?.tradeId ?? null,
      timestamp: new Date().toISOString(),
      direction: 'outbound',
      sender_phone: '',
      recipient_phone: selectedPhone,
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
          recipientPhone: selectedPhone,
          messageBody: optimisticMsg.message_body,
          employeeId: 'staff',
          tradeId: selectedRecipient?.tradeId,
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
    <div className="border-t border-gray-200 bg-white p-3 space-y-2">
      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <select
          value={selectedPhone}
          onChange={(e) => setSelectedPhone(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#e85d04] focus:border-transparent"
        >
          {recipients.map((r) => (
            <option key={r.phone} value={r.phone}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2 items-end">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send)"
          rows={2}
          className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#e85d04] focus:border-transparent"
        />
        <button
          onClick={handleSend}
          disabled={!body.trim() || sending}
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
