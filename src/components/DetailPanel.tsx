'use client';

import { useEffect } from 'react';
import {
  type Customer,
  STATUS_LABEL,
  STATUS_STYLE,
  STEP_PLATFORMS,
  formatDate,
} from '@/types/customer';

interface Props {
  customer: Customer;
  onClose: () => void;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-gray-900 break-words">
        {value || <span className="text-gray-400">—</span>}
      </dd>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-gray-100 pt-4">
      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
        {title}
      </h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">{children}</dl>
    </div>
  );
}

function StarRating({ rating }: { rating: string }) {
  const n = parseInt(rating, 10);
  if (!n || isNaN(n)) return <span className="text-gray-400">—</span>;
  const color =
    n <= 2 ? 'text-red-500' : n === 3 ? 'text-yellow-500' : 'text-yellow-400';
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`w-4 h-4 ${i <= n ? color : 'text-gray-200'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="text-sm font-semibold text-gray-700 ml-1">{n}/5</span>
    </div>
  );
}

export default function DetailPanel({ customer, onClose }: Props) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <>
      {/* Backdrop (mobile only) */}
      <div
        className="fixed inset-0 bg-black/20 z-20 lg:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <aside className="fixed right-0 top-0 h-full w-full max-w-[480px] bg-white shadow-2xl z-30 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100 bg-white">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-gray-900 truncate">
                {customer.customer_name || 'Unknown Customer'}
              </h2>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                  STATUS_STYLE[customer.status] ??
                  'bg-gray-100 text-gray-600 border-gray-200'
                }`}
              >
                {STATUS_LABEL[customer.status] ?? customer.status}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              ID: {customer.customer_id} &middot; Job: {customer.job_id || '—'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-3 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            aria-label="Close panel"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Contact */}
          <Section title="Contact">
            <Field label="Email" value={customer.customer_email} />
            <Field label="Phone" value={customer.customer_phone} />
            <div className="col-span-2">
              <Field label="Address" value={customer.customer_address} />
            </div>
          </Section>

          {/* Job Info */}
          <Section title="Job Info">
            <Field label="Last Milestone" value={customer.last_milestone} />
            <Field label="Job Closed" value={formatDate(customer.job_closed_date)} />
          </Section>

          {/* Rating & Feedback */}
          <Section title="Initial Response">
            <div className="col-span-2">
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Star Rating
              </dt>
              <dd className="mt-1">
                <StarRating rating={customer.initial_rating} />
              </dd>
            </div>
            {customer.initial_feedback && (
              <div className="col-span-2">
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Feedback
                </dt>
                <dd className="mt-1 text-sm text-gray-800 bg-gray-50 rounded-lg p-3 border border-gray-100 italic">
                  &ldquo;{customer.initial_feedback}&rdquo;
                </dd>
              </div>
            )}
          </Section>

          {/* Review Steps */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
              Review Steps
            </h3>
            <div className="space-y-2">
              {[1, 2, 3, 4, 5, 6].map((s) => {
                const confirmed =
                  customer[`step${s}_confirmed` as keyof Customer] === 'yes';
                const date = customer[
                  `step${s}_confirmed_date` as keyof Customer
                ] as string;
                const isCurrent = customer.current_step === s;
                return (
                  <div
                    key={s}
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      confirmed
                        ? 'bg-green-50 border-green-200'
                        : isCurrent
                        ? 'bg-orange-50 border-orange-200'
                        : 'bg-gray-50 border-gray-100'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        confirmed
                          ? 'bg-green-500 text-white'
                          : isCurrent
                          ? 'bg-[#e85d04] text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {confirmed ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        s
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-800">
                        {STEP_PLATFORMS[s]}
                      </div>
                      {confirmed && date && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          Confirmed {formatDate(date)}
                        </div>
                      )}
                      {isCurrent && !confirmed && (
                        <div className="text-xs text-[#e85d04] mt-0.5 font-medium">
                          Current step
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Request History */}
          <Section title="Request History">
            <Field
              label="Last Request Date"
              value={formatDate(customer.last_request_date)}
            />
            <Field
              label="Last Request Step"
              value={
                customer.last_request_step
                  ? `Step ${customer.last_request_step}`
                  : null
              }
            />
            <Field
              label="Post-Close Reminders Sent"
              value={customer.post_close_reminder_count || '0'}
            />
          </Section>

          {/* Notes */}
          {customer.notes && (
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                Notes
              </h3>
              <p className="text-sm text-gray-700 bg-yellow-50 border border-yellow-100 rounded-lg p-3">
                {customer.notes}
              </p>
            </div>
          )}

          {/* Timestamps */}
          <Section title="Record Info">
            <Field label="Created" value={formatDate(customer.created_date)} />
            <Field label="Last Updated" value={formatDate(customer.last_updated)} />
          </Section>
        </div>
      </aside>
    </>
  );
}
