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
  const [showConfirm, setShowConfirm] = useState(false);

  function handleSendClick() {
    if (!body.trim() || !recipientPhone) return;
    setShowConfirm(true);
  }

  async function handleSend() {
    setShowConfirm(false);
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
      handleSendClick();
    }
  }

  return (
    <div className="border-t border-gray-200 bg-white p-3 space-y-2 flex-shrink-0">
      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Send this message?</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  This is an automated system — Shirley AI is already handling scheduling conversations. Only send a manual message if it is truly necessary. Unnecessary messages can confuse the homeowner or subcontractor and disrupt the automated flow.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                className="flex-1 py-2 text-sm font-medium bg-[#e85d04] hover:bg-[#d05203] text-white rounded-xl transition-colors"
              >
                Yes, send it
              </button>
            </div>
          </div>
        </div>
      )}

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
          onClick={handleSendClick}
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
