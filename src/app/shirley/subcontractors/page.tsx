'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Subcontractor } from '@/types/shirley';
import AddSubModal from '@/components/shirley/AddSubModal';

type EditingState = { sub: Subcontractor } | null;

function EditSubModal({
  sub,
  onClose,
  onSaved,
}: {
  sub: Subcontractor;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(sub.name);
  const [phone, setPhone] = useState(sub.phone);
  const [language, setLanguage] = useState<'en' | 'es'>((sub.language as 'en' | 'es') ?? 'en');
  const [tradesHandled, setTradesHandled] = useState((sub.trades_handled ?? []).join(', '));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const res = await fetch(`/api/shirley/subcontractors/${sub.sub_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), language, tradesHandled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#e85d04]';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.currentTarget === e.target) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Edit Subcontractor</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-gray-400 block mb-1">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} autoFocus />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 block mb-1">Phone *</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 block mb-1">Language</label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden w-fit">
              {(['en', 'es'] as const).map((l) => (
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
            <label className="text-[10px] text-gray-400 block mb-1">Trades handled</label>
            <input
              value={tradesHandled}
              onChange={(e) => setTradesHandled(e.target.value)}
              placeholder="e.g. Roofing, Gutters"
              className={inputCls}
            />
            <p className="text-[10px] text-gray-400 mt-1">Comma-separated</p>
          </div>
        </div>
        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
        )}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className="flex-1 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className="flex-1 py-2 text-sm font-medium bg-[#e85d04] hover:bg-[#d05203] disabled:opacity-50 text-white rounded-xl transition-colors">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SubcontractorsPage() {
  const [subs, setSubs] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<EditingState>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null); // sub_id pending confirm

  const fetchSubs = useCallback(async () => {
    try {
      const res = await fetch('/api/shirley/subcontractors');
      if (!res.ok) return;
      const data = await res.json();
      setSubs(data.subcontractors ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSubs(); }, [fetchSubs]);

  async function handleDelete(subId: string) {
    setDeletingId(subId);
    try {
      await fetch(`/api/shirley/subcontractors/${subId}`, { method: 'DELETE' });
      setSubs((prev) => prev.filter((s) => s.sub_id !== subId));
    } finally {
      setDeletingId(null);
      setDeleteConfirm(null);
    }
  }

  return (
    <div className="max-w-screen-xl mx-auto w-full px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">All Subcontractors</h1>
          <p className="text-sm text-gray-500 mt-1">
            {loading ? 'Loading…' : `${subs.length} subcontractor${subs.length !== 1 ? 's' : ''} in database`}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="px-4 py-2 bg-[#e85d04] hover:bg-[#d05203] text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Add Subcontractor
        </button>
      </div>

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="px-5 py-4 animate-pulse flex items-center gap-4">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-40" />
                <div className="h-3 bg-gray-100 rounded w-28" />
              </div>
            </div>
          ))}
        </div>
      ) : subs.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700">No subcontractors yet</p>
          <p className="text-xs text-gray-400 mt-1">Click "Add Subcontractor" to get started</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Phone</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Language</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Trades</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {subs.map((sub) => (
                <tr key={sub.sub_id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-gray-900">{sub.name}</td>
                  <td className="px-5 py-3.5 text-gray-500">{sub.phone}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600 uppercase">
                      {sub.language ?? 'en'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-gray-500">
                    {(sub.trades_handled ?? []).length > 0
                      ? sub.trades_handled.join(', ')
                      : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditing({ sub })}
                        className="text-xs text-gray-500 hover:text-[#e85d04] font-medium transition-colors"
                      >
                        Edit
                      </button>
                      {deleteConfirm === sub.sub_id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-400">Sure?</span>
                          <button
                            onClick={() => handleDelete(sub.sub_id)}
                            disabled={deletingId === sub.sub_id}
                            className="text-xs text-red-600 font-medium hover:underline disabled:opacity-50"
                          >
                            {deletingId === sub.sub_id ? 'Deleting…' : 'Yes, delete'}
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-xs text-gray-400 hover:text-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(sub.sub_id)}
                          className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddSubModal
          onClose={() => setShowAdd(false)}
          onAdded={() => { setShowAdd(false); fetchSubs(); }}
        />
      )}

      {editing && (
        <EditSubModal
          sub={editing.sub}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); fetchSubs(); }}
        />
      )}
    </div>
  );
}
