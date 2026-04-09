'use client';

import { useState } from 'react';
import ActivationForm from '@/components/shirley/ActivationForm';
import AddSubModal from '@/components/shirley/AddSubModal';

export default function ActivatePage() {
  const [showAddSub, setShowAddSub] = useState(false);
  const [subsKey, setSubsKey] = useState(0);

  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Start a New Job</h1>
          <p className="text-sm text-gray-500 mt-1">
            Enter the job and trade details. Shirley will begin coordinating scheduling automatically.
          </p>
        </div>
        <button
          onClick={() => setShowAddSub(true)}
          className="flex-shrink-0 ml-4 mt-1 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap"
        >
          + Add Subcontractor
        </button>
      </div>
      <ActivationForm subsKey={subsKey} />
      {showAddSub && (
        <AddSubModal
          onClose={() => setShowAddSub(false)}
          onAdded={() => { setSubsKey((k) => k + 1); setShowAddSub(false); }}
        />
      )}
    </div>
  );
}
