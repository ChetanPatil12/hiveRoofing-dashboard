'use client';

import { useEffect, useRef, useState } from 'react';

type Language = 'en' | 'es';

interface Props {
  onClose: () => void;
  onAdded: () => void;
}

const inputCls =
  'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#e85d04]';

export default function AddSubModal({ onClose, onAdded }: Props) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [language, setLanguage] = useState<Language>('en');
  const [tradesHandled, setTradesHandled] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  async function handleSave() {
    setError(null);
    if (!name.trim() || !phone.trim()) {
      setError('Name and phone are required.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/shirley/subcontractors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), language, tradesHandled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save subcontractor');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Add Subcontractor</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-gray-400 block mb-1">Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className={inputCls}
              autoFocus
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 block mb-1">Phone *</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1…"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 block mb-1">Language</label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden w-fit">
              {(['en', 'es'] as Language[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLanguage(l)}
                  className={`px-4 py-1.5 text-xs font-medium uppercase transition-colors ${
                    language === l ? 'bg-[#e85d04] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 block mb-1">Trades handled (optional)</label>
            <input
              value={tradesHandled}
              onChange={(e) => setTradesHandled(e.target.value)}
              placeholder="e.g. Roofing, Gutters, Solar"
              className={inputCls}
            />
            <p className="text-[10px] text-gray-400 mt-1">Comma-separated</p>
          </div>
        </div>

        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2 text-sm font-medium bg-[#e85d04] hover:bg-[#d05203] disabled:opacity-50 text-white rounded-xl transition-colors"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
