'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

type SenderRole = 'homeowner' | 'subcontractor' | 'supplier';
type Stage = 'awaiting_supplier' | 'awaiting_sub' | 'awaiting_homeowner' | 'confirmed';

interface SimState {
  stage: Stage;
  proposedDate?: string;
  proposedTime?: string;
  deliveryDate?: string;
  suggestedSubDate?: string;
  round?: number;
}

interface AiResult {
  intent: string;
  confidence: string;
  needsHuman: boolean;
  extractedData: {
    proposedDate: string | null;
    proposedTime: string | null;
    yesNo: boolean | null;
    conditions: string | null;
  };
  language: string;
}

interface PanelMessage {
  from: 'user' | 'shirley';
  text: string;
  ai?: AiResult;
  reason?: string;
  isCrossParty?: boolean;
}

interface CrossPartyMessage {
  to: SenderRole;
  message: string;
  reason: string;
}

interface SimResponse {
  reply: string;
  aiResult: AiResult;
  newState: SimState;
  crossPartyMessages: CrossPartyMessage[];
}

interface Job {
  job_id: string;
  property_address: string;
  homeowner_name: string;
}

const STAGE_LABELS: Record<Stage, string> = {
  awaiting_supplier: 'Awaiting Supplier',
  awaiting_sub: 'Awaiting Sub',
  awaiting_homeowner: 'Awaiting Homeowner',
  confirmed: 'Confirmed',
};

const STAGE_COLORS: Record<Stage, string> = {
  awaiting_supplier: 'bg-slate-100 text-slate-700 border-slate-300',
  awaiting_sub: 'bg-blue-100 text-blue-700 border-blue-300',
  awaiting_homeowner: 'bg-orange-100 text-[#e85d04] border-orange-300',
  confirmed: 'bg-green-100 text-green-700 border-green-300',
};

function fmtDate(iso?: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', timeZone: 'UTC',
    });
  } catch { return iso; }
}

// ── Chat Panel ───────────────────────────────────────────────────────────────

interface PanelProps {
  role: SenderRole;
  label: string;
  accentBg: string;
  accentText: string;
  userBubble: string;
  messages: PanelMessage[];
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  loading: boolean;
  isDisabled: boolean;
  expandedIdx: number | null;
  setExpandedIdx: (i: number | null) => void;
  isActive: boolean;
  onHeaderTap: () => void;
  isMobile: boolean;
  hasNew: boolean;
}

function ChatPanel({
  role, label, accentBg, accentText, userBubble,
  messages, input, setInput, onSend, loading, isDisabled,
  expandedIdx, setExpandedIdx, isActive, onHeaderTap, isMobile, hasNew,
}: PanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
  };

  const collapsed = isMobile && !isActive;

  return (
    <div className={`flex flex-col border border-gray-200 rounded-xl overflow-hidden bg-white ${isMobile ? 'w-full' : 'flex-1 min-w-0'}`}>
      {/* Panel header */}
      <button
        onClick={onHeaderTap}
        className={`flex items-center justify-between px-4 py-3 text-white ${accentBg} ${isMobile ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{label}</span>
          {isDisabled && !collapsed && (
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">waiting</span>
          )}
          {hasNew && collapsed && (
            <span className="w-2 h-2 rounded-full bg-purple-300 animate-pulse" />
          )}
        </div>
        {isMobile && (
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <span className="text-[10px] bg-white/25 px-1.5 py-0.5 rounded-full">{messages.length}</span>
            )}
            <svg className={`w-4 h-4 transition-transform ${isActive ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        )}
      </button>

      {!collapsed && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[240px] max-h-[420px]">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-gray-400 py-8">
                {isDisabled ? `Waiting for stage...` : `Type a message as the ${label.toLowerCase()}`}
              </div>
            ) : messages.map((msg, i) => (
              <div key={i} className={`flex flex-col ${msg.from === 'user' ? 'items-end' : 'items-start'}`}>
                {msg.isCrossParty && (
                  <span className="text-[9px] text-purple-500 font-medium mb-0.5 px-1">Shirley → auto</span>
                )}
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed border ${
                  msg.from === 'user'
                    ? `${userBubble} rounded-br-sm`
                    : msg.isCrossParty
                    ? 'bg-purple-50 border-purple-200 text-gray-800 rounded-bl-sm'
                    : 'bg-white border-gray-200 text-gray-800 rounded-bl-sm'
                }`}>
                  {msg.text}
                </div>

                {/* AI reasoning accordion — only for direct Shirley messages */}
                {msg.from === 'shirley' && msg.ai && (
                  <div className="mt-1 max-w-[85%] w-full">
                    <button
                      onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                      className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-1"
                    >
                      <svg className={`w-3 h-3 transition-transform ${expandedIdx === i ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      {msg.ai.intent} · {msg.ai.confidence} confidence{msg.ai.needsHuman ? ' · 🚨 needs human' : ''}
                    </button>
                    {expandedIdx === i && (
                      <div className="mt-1 text-[11px] bg-gray-50 border border-gray-100 rounded-lg p-2.5 space-y-1 text-gray-600">
                        <div><span className="font-medium text-gray-800">Intent:</span> {msg.ai.intent}</div>
                        <div><span className="font-medium text-gray-800">Confidence:</span> {msg.ai.confidence}</div>
                        <div><span className="font-medium text-gray-800">Needs human:</span> {String(msg.ai.needsHuman)}</div>
                        <div><span className="font-medium text-gray-800">Language:</span> {msg.ai.language}</div>
                        {msg.ai.extractedData && Object.entries(msg.ai.extractedData).map(([k, v]) => v != null && (
                          <div key={k}><span className="font-medium text-gray-800">{k}:</span> {String(v)}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {/* Reason badge for cross-party messages */}
                {msg.from === 'shirley' && msg.isCrossParty && msg.reason && (
                  <p className="text-[9px] text-purple-400 mt-0.5 px-1 max-w-[85%]">{msg.reason}</p>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-3 py-2">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className={`border-t border-gray-100 p-2 flex gap-2 ${isDisabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={isDisabled || loading}
              placeholder={isDisabled ? `Waiting for stage…` : `Type as ${label.toLowerCase()}…`}
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#e85d04] disabled:bg-gray-50"
            />
            <button
              onClick={onSend}
              disabled={isDisabled || loading || !input.trim()}
              className={`px-3 py-1.5 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-40 ${accentBg} hover:opacity-90`}
            >
              Send
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function SimulatePage() {
  // Job context
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [manualAddress, setManualAddress] = useState('123 Test St, San Diego CA');
  const [manualHomeowner, setManualHomeowner] = useState('Alex');
  const [manualSubName, setManualSubName] = useState('Mike');
  const [manualTrade, setManualTrade] = useState('Roofing - Replacement');
  const [manualAccess, setManualAccess] = useState('exterior');
  const [manualNotes, setManualNotes] = useState('');

  // Shared state machine
  const [simState, setSimState] = useState<SimState>({ stage: 'awaiting_supplier', round: 1 });

  // Per-panel messages
  const [supplierMsgs, setSupplierMsgs] = useState<PanelMessage[]>([]);
  const [subMsgs, setSubMsgs] = useState<PanelMessage[]>([]);
  const [homeownerMsgs, setHomeownerMsgs] = useState<PanelMessage[]>([]);

  // Per-panel inputs
  const [supplierInput, setSupplierInput] = useState('');
  const [subInput, setSubInput] = useState('');
  const [homeownerInput, setHomeownerInput] = useState('');

  // Per-panel loading
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [subLoading, setSubLoading] = useState(false);
  const [homeownerLoading, setHomeownerLoading] = useState(false);

  // Per-panel AI accordion
  const [supplierExpanded, setSupplierExpanded] = useState<number | null>(null);
  const [subExpanded, setSubExpanded] = useState<number | null>(null);
  const [homeownerExpanded, setHomeownerExpanded] = useState<number | null>(null);

  // Mobile
  const [activeMobilePanel, setActiveMobilePanel] = useState<SenderRole>('supplier');
  const [isMobile, setIsMobile] = useState(false);

  // New-message indicator for collapsed panels
  const [supplierHasNew, setSupplierHasNew] = useState(false);
  const [subHasNew, setSubHasNew] = useState(false);
  const [homeownerHasNew, setHomeownerHasNew] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    fetch('/api/shirley/jobs').then(r => r.json()).then(d => {
      if (Array.isArray(d)) setJobs(d);
    }).catch(() => {});
  }, []);

  // Derive disabled state per panel
  const supplierDisabled = simState.stage !== 'awaiting_supplier';
  const subDisabled = simState.stage !== 'awaiting_sub';
  const homeownerDisabled = simState.stage !== 'awaiting_homeowner';

  const jobContext = selectedJobId
    ? { jobId: selectedJobId }
    : {
        propertyAddress: manualAddress,
        homeownerName: manualHomeowner,
        subName: manualSubName,
        tradeType: manualTrade,
        accessType: manualAccess,
        jobNotes: manualNotes || undefined,
      };

  const appendToPanel = useCallback((role: SenderRole, msg: PanelMessage) => {
    if (role === 'supplier') {
      setSupplierMsgs(prev => [...prev, msg]);
      if (isMobile && activeMobilePanel !== 'supplier') setSupplierHasNew(true);
    } else if (role === 'subcontractor') {
      setSubMsgs(prev => [...prev, msg]);
      if (isMobile && activeMobilePanel !== 'subcontractor') setSubHasNew(true);
    } else {
      setHomeownerMsgs(prev => [...prev, msg]);
      if (isMobile && activeMobilePanel !== 'homeowner') setHomeownerHasNew(true);
    }
  }, [isMobile, activeMobilePanel]);

  const sendMessage = useCallback(async (role: SenderRole) => {
    const inputMap: Record<SenderRole, string> = {
      supplier: supplierInput,
      subcontractor: subInput,
      homeowner: homeownerInput,
    };
    const msgsMap: Record<SenderRole, PanelMessage[]> = {
      supplier: supplierMsgs,
      subcontractor: subMsgs,
      homeowner: homeownerMsgs,
    };
    const setLoadingMap: Record<SenderRole, (v: boolean) => void> = {
      supplier: setSupplierLoading,
      subcontractor: setSubLoading,
      homeowner: setHomeownerLoading,
    };
    const clearInputMap: Record<SenderRole, () => void> = {
      supplier: () => setSupplierInput(''),
      subcontractor: () => setSubInput(''),
      homeowner: () => setHomeownerInput(''),
    };

    const text = inputMap[role].trim();
    const isLoading = role === 'supplier' ? supplierLoading : role === 'subcontractor' ? subLoading : homeownerLoading;
    if (!text || isLoading) return;

    const existingMsgs = msgsMap[role];

    // Optimistic user message
    appendToPanel(role, { from: 'user', text });
    clearInputMap[role]();
    setLoadingMap[role](true);

    // Build conversation history from this panel's messages
    const conversationHistory = existingMsgs.map(m => ({
      role: (m.from === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.text,
    }));

    try {
      const res = await fetch('/api/shirley/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...jobContext,
          senderRole: role,
          currentState: simState,
          conversationHistory,
          newMessage: text,
        }),
      });

      const data: SimResponse = await res.json();

      // Shirley's direct reply to sender
      appendToPanel(role, { from: 'shirley', text: data.reply, ai: data.aiResult });

      // Advance shared state
      setSimState(data.newState);

      // Cross-party messages with delay
      data.crossPartyMessages.forEach((cp, idx) => {
        setTimeout(() => {
          appendToPanel(cp.to, {
            from: 'shirley',
            text: cp.message,
            reason: cp.reason,
            isCrossParty: true,
          });
        }, 800 * (idx + 1));
      });
    } catch {
      appendToPanel(role, { from: 'shirley', text: "Something went wrong — try again.", isCrossParty: false });
    } finally {
      setLoadingMap[role](false);
    }
  }, [
    supplierInput, subInput, homeownerInput,
    supplierMsgs, subMsgs, homeownerMsgs,
    supplierLoading, subLoading, homeownerLoading,
    simState, jobContext, appendToPanel,
  ]);

  const handleReset = () => {
    setSimState({ stage: 'awaiting_supplier', round: 1 });
    setSupplierMsgs([]); setSubMsgs([]); setHomeownerMsgs([]);
    setSupplierInput(''); setSubInput(''); setHomeownerInput('');
    setSupplierHasNew(false); setSubHasNew(false); setHomeownerHasNew(false);
    setSupplierExpanded(null); setSubExpanded(null); setHomeownerExpanded(null);
  };

  const handleMobilePanelTap = (role: SenderRole) => {
    setActiveMobilePanel(role);
    if (role === 'supplier') setSupplierHasNew(false);
    else if (role === 'subcontractor') setSubHasNew(false);
    else setHomeownerHasNew(false);
  };

  const panels = [
    {
      role: 'supplier' as SenderRole,
      label: 'Supplier',
      accentBg: 'bg-slate-600',
      accentText: 'text-slate-700',
      userBubble: 'bg-slate-100 text-slate-800 border-slate-200',
      messages: supplierMsgs,
      input: supplierInput,
      setInput: setSupplierInput,
      onSend: () => sendMessage('supplier'),
      loading: supplierLoading,
      isDisabled: supplierDisabled,
      expandedIdx: supplierExpanded,
      setExpandedIdx: setSupplierExpanded,
      hasNew: supplierHasNew,
    },
    {
      role: 'subcontractor' as SenderRole,
      label: 'Sub',
      accentBg: 'bg-blue-600',
      accentText: 'text-blue-700',
      userBubble: 'bg-blue-50 text-blue-800 border-blue-200',
      messages: subMsgs,
      input: subInput,
      setInput: setSubInput,
      onSend: () => sendMessage('subcontractor'),
      loading: subLoading,
      isDisabled: subDisabled,
      expandedIdx: subExpanded,
      setExpandedIdx: setSubExpanded,
      hasNew: subHasNew,
    },
    {
      role: 'homeowner' as SenderRole,
      label: 'Homeowner',
      accentBg: 'bg-[#e85d04]',
      accentText: 'text-[#e85d04]',
      userBubble: 'bg-orange-50 text-orange-800 border-orange-200',
      messages: homeownerMsgs,
      input: homeownerInput,
      setInput: setHomeownerInput,
      onSend: () => sendMessage('homeowner'),
      loading: homeownerLoading,
      isDisabled: homeownerDisabled,
      expandedIdx: homeownerExpanded,
      setExpandedIdx: setHomeownerExpanded,
      hasNew: homeownerHasNew,
    },
  ];

  return (
    <div className="flex h-full min-h-0">
      {/* Left sidebar */}
      <aside className="w-60 flex-shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col overflow-y-auto">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Simulation Sandbox</h2>
          <p className="text-xs text-gray-500 mt-0.5">No SMS sent · No DB writes</p>
        </div>

        <div className="p-4 space-y-3 flex-1">
          {/* Job picker */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Load real job</label>
            <select
              value={selectedJobId}
              onChange={e => setSelectedJobId(e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#e85d04]"
            >
              <option value="">Manual context ↓</option>
              {jobs.map(j => (
                <option key={j.job_id} value={j.job_id}>{j.property_address}</option>
              ))}
            </select>
          </div>

          {/* Manual context — only shown when no job selected */}
          {!selectedJobId && (
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-500 block mb-0.5">Address</label>
                <input value={manualAddress} onChange={e => setManualAddress(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#e85d04]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-0.5">Homeowner name</label>
                <input value={manualHomeowner} onChange={e => setManualHomeowner(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#e85d04]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-0.5">Sub name</label>
                <input value={manualSubName} onChange={e => setManualSubName(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#e85d04]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-0.5">Trade type</label>
                <input value={manualTrade} onChange={e => setManualTrade(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#e85d04]" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-0.5">Access type</label>
                <select value={manualAccess} onChange={e => setManualAccess(e.target.value)}
                  className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-[#e85d04]">
                  <option value="exterior">Exterior</option>
                  <option value="interior">Interior</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-0.5">Job notes</label>
                <textarea value={manualNotes} onChange={e => setManualNotes(e.target.value)} rows={3}
                  placeholder="EagleView notes, scope, measurements…"
                  className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-[#e85d04]" />
              </div>
            </div>
          )}
        </div>

        {/* Reset button */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleReset}
            className="w-full text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-2 hover:bg-white hover:text-gray-700 transition-colors"
          >
            Reset Simulation
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Stage bar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-200 bg-white flex-shrink-0 flex-wrap">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STAGE_COLORS[simState.stage]}`}>
            {STAGE_LABELS[simState.stage]}
          </span>
          {simState.deliveryDate && (
            <span className="text-xs text-gray-500">Delivery: <span className="font-medium text-gray-700">{fmtDate(simState.deliveryDate)}</span></span>
          )}
          {simState.proposedDate && (
            <span className="text-xs text-gray-500">Proposed: <span className="font-medium text-gray-700">{fmtDate(simState.proposedDate)}{simState.proposedTime ? ` @ ${simState.proposedTime}` : ''}</span></span>
          )}
          {(simState.round ?? 1) > 1 && (
            <span className="text-xs text-gray-400">Round {simState.round}</span>
          )}
        </div>

        {/* Panels */}
        <div className={`flex-1 min-h-0 p-4 overflow-y-auto ${isMobile ? 'flex flex-col gap-3' : 'flex flex-row gap-4 items-stretch'}`}>
          {panels.map(p => (
            <ChatPanel
              key={p.role}
              {...p}
              isActive={!isMobile || activeMobilePanel === p.role}
              onHeaderTap={() => isMobile ? handleMobilePanelTap(p.role) : undefined}
              isMobile={isMobile}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
