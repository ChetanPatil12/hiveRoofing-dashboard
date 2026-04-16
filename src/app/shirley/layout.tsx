'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Escalation } from '@/types/shirley';
import EscalationPanel from '@/components/shirley/EscalationPanel';

const NAV_ITEMS = [
  {
    href: '/shirley/inbox',
    label: 'Inbox',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    href: '/shirley/jobs',
    label: 'All Jobs',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    href: '/shirley/subcontractors',
    label: 'All Subs',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    href: '/shirley/activate',
    label: 'New Job',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
    primary: true,
  },
  {
    href: '/shirley/simulate',
    label: 'Simulate',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
];

export default function ShirleyLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);

  const fetchEscalations = useCallback(async () => {
    try {
      const res = await fetch('/api/shirley/escalations');
      if (!res.ok) return;
      const data = await res.json();
      setEscalations(data.escalations ?? []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchEscalations();
    const interval = setInterval(fetchEscalations, 60_000);
    return () => clearInterval(interval);
  }, [fetchEscalations]);

  function handleResolve(id: string) {
    setEscalations((prev) => prev.filter((e) => e.escalation_id !== id));
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#e85d04' }}>
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <span className="font-semibold text-gray-900 text-sm group-hover:text-[#e85d04] transition-colors">Shirley Agent</span>
            </Link>
            {/* Desktop nav — hidden on mobile */}
            <nav className="hidden sm:flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      item.primary
                        ? 'bg-[#e85d04] hover:bg-[#d05203] text-white'
                        : isActive
                        ? 'bg-orange-50 text-[#e85d04]'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Notification bell */}
          <button
            onClick={() => setPanelOpen(true)}
            className="relative w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {escalations.length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {escalations.length > 99 ? '99+' : escalations.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main content — extra bottom padding on mobile for tab bar */}
      <main className="flex-1 flex flex-col pb-16 sm:pb-0">
        {children}
      </main>

      {/* Mobile bottom tab bar — visible only on mobile */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 flex items-stretch">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                item.primary
                  ? 'text-[#e85d04]'
                  : isActive
                  ? 'text-[#e85d04]'
                  : 'text-gray-400'
              }`}
            >
              <span className={`w-6 h-6 flex items-center justify-center rounded-lg ${item.primary ? 'bg-[#e85d04] text-white' : ''}`}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Escalation slide-over */}
      {panelOpen && (
        <EscalationPanel
          escalations={escalations}
          onClose={() => setPanelOpen(false)}
          onResolve={handleResolve}
        />
      )}
    </div>
  );
}
