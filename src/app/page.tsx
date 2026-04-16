'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Home() {
  const [installModal, setInstallModal] = useState<'ios' | 'android' | null>(null);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">

      {/* Header */}
      <div className="mb-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#e85d04' }}>
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Hive Roofing &amp; Solar</h1>
        </div>
        <p className="text-gray-500 text-sm">Choose a dashboard to continue</p>
      </div>

      {/* Dashboard cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-full max-w-2xl">
        <Link href="/reputation" className="group bg-white border border-gray-200 rounded-2xl p-7 shadow-sm hover:shadow-md hover:border-[#e85d04] transition-all duration-200 flex flex-col gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center group-hover:bg-orange-100 transition-colors">
            <svg className="w-7 h-7 text-[#e85d04]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Reputation Management</h2>
            <p className="text-sm text-gray-500 leading-relaxed">Track review requests, monitor customer feedback, and manage your online reputation.</p>
          </div>
          <div className="flex items-center gap-1 text-sm font-medium text-[#e85d04] mt-auto">
            Open dashboard
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>

        <Link href="/shirley" className="group bg-white border border-gray-200 rounded-2xl p-7 shadow-sm hover:shadow-md hover:border-[#e85d04] transition-all duration-200 flex flex-col gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
            <svg className="w-7 h-7 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Shirley Agent</h2>
            <p className="text-sm text-gray-500 leading-relaxed">Start jobs, monitor scheduling conversations, and review flagged messages between homeowners and subcontractors.</p>
          </div>
          <div className="flex items-center gap-1 text-sm font-medium text-blue-600 mt-auto">
            Open dashboard
            <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>
      </div>

      {/* Install app section */}
      <div className="mt-10 w-full max-w-2xl">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-700">Install as app on your phone</h3>
          </div>
          <p className="text-xs text-gray-400 mb-4">Add this dashboard to your home screen for quick access — works like a native app, no App Store needed.</p>
          <div className="flex gap-3">
            <button
              onClick={() => setInstallModal('ios')}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {/* Apple icon */}
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              Install on iPhone
            </button>
            <button
              onClick={() => setInstallModal('android')}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#3ddc84] hover:bg-[#2fbb70] text-gray-900 text-sm font-medium rounded-xl transition-colors"
            >
              {/* Android icon */}
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.523 15.341c-.414 0-.75-.336-.75-.75V9.75c0-.414.336-.75.75-.75s.75.336.75.75v4.841c0 .414-.336.75-.75.75zm-11.046 0c-.414 0-.75-.336-.75-.75V9.75c0-.414.336-.75.75-.75s.75.336.75.75v4.841c0 .414-.336.75-.75.75zM8.5 20.5c0 .276.224.5.5.5h.5v2.25c0 .414.336.75.75.75s.75-.336.75-.75V21h1.5v2.25c0 .414.336.75.75.75s.75-.336.75-.75V21h.5c.276 0 .5-.224.5-.5v-9h-6v9zM15.5 6H14V4.5c0-.276-.224-.5-.5-.5h-3c-.276 0-.5.224-.5.5V6H8.5C7.12 6 6 7.12 6 8.5V11h12V8.5C18 7.12 16.88 6 15.5 6zM10.25 4.75h3.5v1.25h-3.5V4.75zM9.5 8.5c-.276 0-.5-.224-.5-.5s.224-.5.5-.5.5.224.5.5-.224.5-.5.5zm5 0c-.276 0-.5-.224-.5-.5s.224-.5.5-.5.5.224.5.5-.224.5-.5.5z"/>
              </svg>
              Install on Android
            </button>
          </div>
        </div>
      </div>

      {/* iOS install modal */}
      {installModal === 'ios' && (
        <InstallModal onClose={() => setInstallModal(null)} platform="ios" />
      )}

      {/* Android install modal */}
      {installModal === 'android' && (
        <InstallModal onClose={() => setInstallModal(null)} platform="android" />
      )}
    </div>
  );
}

function InstallModal({ onClose, platform }: { onClose: () => void; platform: 'ios' | 'android' }) {
  const steps = platform === 'ios'
    ? [
        { icon: '1', text: 'Open this page in Safari on your iPhone (not Chrome).' },
        { icon: '2', text: 'Tap the Share button at the bottom of the screen — it looks like a box with an arrow pointing up.' },
        { icon: '3', text: 'Scroll down in the share sheet and tap "Add to Home Screen".' },
        { icon: '4', text: 'Tap "Add" in the top right corner.' },
        { icon: '✓', text: 'The Hive app icon will appear on your home screen. Tap it to open fullscreen.' },
      ]
    : [
        { icon: '1', text: 'Open this page in Chrome on your Android device.' },
        { icon: '2', text: 'Tap the three-dot menu (⋮) in the top right corner of Chrome.' },
        { icon: '3', text: 'Tap "Add to Home screen" or "Install app" if you see a banner.' },
        { icon: '4', text: 'Tap "Add" or "Install" to confirm.' },
        { icon: '✓', text: 'The Hive app icon will appear on your home screen. Tap it to open fullscreen.' },
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6 space-y-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {platform === 'ios'
              ? <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
              : <svg className="w-5 h-5 text-[#3ddc84]" viewBox="0 0 24 24" fill="currentColor"><path d="M17.523 15.341c-.414 0-.75-.336-.75-.75V9.75c0-.414.336-.75.75-.75s.75.336.75.75v4.841c0 .414-.336.75-.75.75zm-11.046 0c-.414 0-.75-.336-.75-.75V9.75c0-.414.336-.75.75-.75s.75.336.75.75v4.841c0 .414-.336.75-.75.75zM8.5 20.5c0 .276.224.5.5.5h.5v2.25c0 .414.336.75.75.75s.75-.336.75-.75V21h1.5v2.25c0 .414.336.75.75.75s.75-.336.75-.75V21h.5c.276 0 .5-.224.5-.5v-9h-6v9zM15.5 6H14V4.5c0-.276-.224-.5-.5-.5h-3c-.276 0-.5.224-.5.5V6H8.5C7.12 6 6 7.12 6 8.5V11h12V8.5C18 7.12 16.88 6 15.5 6z"/></svg>
            }
            <h3 className="font-semibold text-gray-900">
              Install on {platform === 'ios' ? 'iPhone' : 'Android'}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="flex gap-3 items-start">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                step.icon === '✓' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-[#e85d04]'
              }`}>
                {step.icon}
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">{step.text}</p>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-[#e85d04] hover:bg-[#d05203] text-white text-sm font-semibold rounded-xl transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
