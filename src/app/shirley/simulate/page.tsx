'use client';

import { useState, useRef, useEffect } from 'react';

type ContactRole = 'homeowner' | 'subcontractor' | 'supplier';
type ConversationTurn = { role: 'user' | 'assistant'; content: string };

interface AiResult {
  intent: string;
  confidence: string;
  needsHuman: boolean;
  suggestedReply: string;
  extractedData: {
    proposedDate: string | null;
    proposedTime: string | null;
    yesNo: boolean | null;
    conditions: string | null;
  };
  language: string;
}

interface Message {
  from: 'you' | 'shirley';
  text: string;
  ai?: AiResult;
}

interface Job {
  job_id: string;
  property_address: string;
  homeowner_name: string;
}

const inputCls = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#e85d04]';
const selectCls = 'w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#e85d04]';

export default function SimulatePage() {
  // Context setup
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [contactRole, setContactRole] = useState<ContactRole>('subcontractor');
  // Manual context fields (used when no job selected)
  const [manualAddress, setManualAddress] = useState('');
  const [manualTrade, setManualTrade] = useState('Roofing - Replacement');
  const [manualSubName, setManualSubName] = useState('Mike');
  const [manualNotes, setManualNotes] = useState('');
  const [schedulingGoal, setSchedulingGoal] = useState('');

  // Conversation
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/shirley/jobs')
      .then(r => r.json())
      .then(d => setJobs((d.jobs ?? []).slice(0, 50)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const newMsg: Message = { from: 'you', text };
    setMessages(prev => [...prev, newMsg]);
    setInput('');
    setLoading(true);

    // Build conversation history (exclude the message just typed)
    const history: ConversationTurn[] = messages.map(m => ({
      role: m.from === 'you' ? 'user' : 'assistant',
      content: m.text,
    }));

    try {
      const body: Record<string, unknown> = {
        contactRole,
        conversationHistory: history,
        newMessage: text,
        schedulingGoal: schedulingGoal || undefined,
      };

      if (selectedJobId) {
        body.jobId = selectedJobId;
      } else {
        body.propertyAddress = manualAddress || '123 Test Street, Austin TX';
        body.tradeType = manualTrade;
        body.subName = manualSubName;
        body.jobNotes = manualNotes || undefined;
      }

      const res = await fetch('/api/shirley/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json() as AiResult & { error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? `Error ${res.status}`);

      setMessages(prev => [...prev, {
        from: 'shirley',
        text: data.suggestedReply,
        ai: data,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        from: 'shirley',
        text: `[Error: ${err instanceof Error ? err.message : 'Unknown error'}]`,
      }]);
    } finally {
      setLoading(false);
    }
  }

  function copyPromptContext() {
    const selectedJob = jobs.find(j => j.job_id === selectedJobId);
    const ctx = selectedJobId
      ? `Job: ${selectedJob?.property_address ?? selectedJobId}`
      : `Property: ${manualAddress}\nTrade: ${manualTrade}\nSub: ${manualSubName}\nNotes: ${manualNotes}`;
    navigator.clipboard.writeText(`Role: ${contactRole}\n${ctx}\n\nConversation:\n${messages.map(m => `${m.from === 'you' ? 'You' : 'Shirley'}: ${m.text}`).join('\n')}`);
  }

  return (
    <div className="flex h-[calc(100vh-57px)]">

      {/* ── Left panel: context setup ──────────────────────────────────────── */}
      <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto p-4 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-800 mb-1">Simulation Sandbox</h2>
          <p className="text-[11px] text-gray-400">No SMS sent. No DB writes. Pure AI testing.</p>
        </div>

        {/* Role selector */}
        <div>
          <label className="text-[10px] text-gray-400 block mb-1">You are texting as</label>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(['subcontractor', 'homeowner', 'supplier'] as ContactRole[]).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => setContactRole(r)}
                className={`flex-1 text-xs py-1.5 capitalize transition-colors ${contactRole === r ? 'bg-[#e85d04] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {r === 'subcontractor' ? 'Sub' : r === 'homeowner' ? 'Owner' : 'Supplier'}
              </button>
            ))}
          </div>
        </div>

        {/* Job picker */}
        <div>
          <label className="text-[10px] text-gray-400 block mb-1">Load a real job (optional)</label>
          <select value={selectedJobId} onChange={e => setSelectedJobId(e.target.value)} className={selectCls}>
            <option value="">— use manual context below —</option>
            {jobs.map(j => (
              <option key={j.job_id} value={j.job_id}>
                {j.homeowner_name} · {j.property_address.slice(0, 30)}
              </option>
            ))}
          </select>
        </div>

        {/* Manual context — shown when no job selected */}
        {!selectedJobId && (
          <div className="space-y-2 border-t border-gray-100 pt-3">
            <label className="text-[10px] text-gray-400 block">Manual context</label>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Property address</label>
              <input value={manualAddress} onChange={e => setManualAddress(e.target.value)} placeholder="123 Main St, Austin TX" className={inputCls} />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Trade type</label>
              <input value={manualTrade} onChange={e => setManualTrade(e.target.value)} placeholder="Roofing - Replacement" className={inputCls} />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Sub name</label>
              <input value={manualSubName} onChange={e => setManualSubName(e.target.value)} placeholder="Mike" className={inputCls} />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Job notes / measurements</label>
              <textarea
                value={manualNotes}
                onChange={e => setManualNotes(e.target.value)}
                placeholder="e.g. Total Roof Area: 1,632 sq ft | 16.32 squares | Full replacement"
                rows={4}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-[#e85d04]"
              />
            </div>
          </div>
        )}

        {/* Scheduling goal override */}
        <div>
          <label className="text-[10px] text-gray-400 block mb-1">Override scheduling goal (optional)</label>
          <input
            value={schedulingGoal}
            onChange={e => setSchedulingGoal(e.target.value)}
            placeholder="e.g. Get sub to confirm Monday"
            className={inputCls}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2 border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={() => { setMessages([]); setExpandedIdx(null); }}
            className="flex-1 text-xs py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            Clear chat
          </button>
          <button
            type="button"
            onClick={copyPromptContext}
            className="flex-1 text-xs py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            Copy context
          </button>
        </div>
      </div>

      {/* ── Right panel: conversation ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <p className="text-sm font-medium text-gray-500">Start typing to test Shirley</p>
                <p className="text-xs text-gray-400 mt-1">No messages will be sent to real contacts</p>
                <div className="mt-4 space-y-1 text-xs text-gray-400 text-left">
                  <p>Try: "Repair or replacement? How many squares?"</p>
                  <p>Try: "Yeah Monday 9am works"</p>
                  <p>Try: "How much does this pay?"</p>
                  <p>Try: "I'm done working with you guys"</p>
                </div>
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.from === 'you' ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[70%] space-y-1">
                {/* Bubble */}
                <div className={`rounded-2xl px-4 py-2.5 text-sm ${
                  msg.from === 'you'
                    ? 'bg-[#e85d04] text-white rounded-br-sm'
                    : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                }`}>
                  {msg.text}
                </div>

                {/* AI reasoning panel — Shirley messages only */}
                {msg.from === 'shirley' && msg.ai && (
                  <div className="ml-1">
                    <button
                      type="button"
                      onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
                      className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-1"
                    >
                      <span>{expandedIdx === idx ? '▾' : '▸'}</span>
                      {msg.ai.intent} · {msg.ai.confidence} confidence
                      {msg.ai.needsHuman && <span className="ml-1 text-red-500 font-semibold">· needs human</span>}
                    </button>

                    {expandedIdx === idx && (
                      <div className="mt-1 bg-gray-50 border border-gray-200 rounded-lg p-3 text-[11px] text-gray-600 space-y-1 font-mono">
                        <div><span className="text-gray-400">intent:</span> {msg.ai.intent}</div>
                        <div><span className="text-gray-400">confidence:</span> {msg.ai.confidence}</div>
                        <div><span className="text-gray-400">needsHuman:</span> {String(msg.ai.needsHuman)}</div>
                        <div><span className="text-gray-400">language:</span> {msg.ai.language}</div>
                        {msg.ai.extractedData.proposedDate && (
                          <div><span className="text-gray-400">proposedDate:</span> {msg.ai.extractedData.proposedDate}</div>
                        )}
                        {msg.ai.extractedData.proposedTime && (
                          <div><span className="text-gray-400">proposedTime:</span> {msg.ai.extractedData.proposedTime}</div>
                        )}
                        {msg.ai.extractedData.yesNo !== null && (
                          <div><span className="text-gray-400">yesNo:</span> {String(msg.ai.extractedData.yesNo)}</div>
                        )}
                        {msg.ai.extractedData.conditions && (
                          <div><span className="text-gray-400">conditions:</span> {msg.ai.extractedData.conditions}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-4 py-2.5 shadow-sm">
                <div className="flex gap-1 items-center">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input bar */}
        <div className="border-t border-gray-200 bg-white px-4 py-3">
          <div className="flex gap-2 max-w-3xl mx-auto">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={`Type as ${contactRole}…`}
              disabled={loading}
              className="flex-1 text-sm border border-gray-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#e85d04] disabled:opacity-50"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-5 py-2.5 bg-[#e85d04] hover:bg-[#d05203] disabled:opacity-40 text-white text-sm font-medium rounded-xl transition-colors"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
