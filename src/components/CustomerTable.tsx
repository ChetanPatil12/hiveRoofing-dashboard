'use client';

import {
  type Customer,
  STATUS_LABEL,
  STATUS_STYLE,
  countStepsConfirmed,
  calcAvgNps,
  formatDate,
} from '@/types/customer';

interface Props {
  customers: Customer[];
  onSelectCustomer: (customer: Customer) => void;
  selectedId: string | undefined;
}

function StepDots({ customer }: { customer: Customer }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5, 6].map((s) => {
        const isConfirmed =
          customer[`step${s}_confirmed` as keyof Customer] === 'yes';
        return (
          <div
            key={s}
            title={`Step ${s}`}
            className={`w-3 h-3 rounded-full border ${
              isConfirmed
                ? 'bg-green-500 border-green-500'
                : 'bg-white border-gray-300'
            }`}
          />
        );
      })}
    </div>
  );
}

function AvgNpsBadge({ score }: { score: string }) {
  if (!score) return <span className="text-gray-400 text-xs">—</span>;
  const n = parseFloat(score);
  const color =
    n < 7 ? 'bg-red-100 text-red-700 border-red-200'
    : n < 9 ? 'bg-amber-100 text-amber-700 border-amber-200'
    : 'bg-green-100 text-green-700 border-green-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${color}`}>
      {score}
    </span>
  );
}

export default function CustomerTable({
  customers,
  onSelectCustomer,
  selectedId,
}: Props) {
  if (customers.length === 0) {
    return (
      <div className="mt-4 text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-200">
        No customers match your filters.
      </div>
    );
  }

  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
              Customer
            </th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
              Status
            </th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
              Step
            </th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
              Progress
            </th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
              Avg NPS
            </th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
              Last Request
            </th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">
              Last Milestone
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100">
          {customers.map((customer) => {
            const isSelected = customer.customer_id === selectedId;
            const confirmed = countStepsConfirmed(customer);
            return (
              <tr
                key={customer.customer_id}
                onClick={() => onSelectCustomer(customer)}
                className={`cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-orange-50 border-l-2 border-l-[#e85d04]'
                    : 'hover:bg-gray-50'
                }`}
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">
                    {customer.customer_name || '—'}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">
                    {customer.customer_address || customer.customer_email || ''}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                      STATUS_STYLE[customer.status] ??
                      'bg-gray-100 text-gray-600 border-gray-200'
                    }`}
                  >
                    {STATUS_LABEL[customer.status] ?? customer.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700 tabular-nums">
                  {customer.current_step > 0 ? `Step ${customer.current_step}` : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <StepDots customer={customer} />
                    <span className="text-xs text-gray-400">
                      {confirmed}/6 confirmed
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <AvgNpsBadge score={calcAvgNps(customer)} />
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {formatDate(customer.last_request_date)}
                </td>
                <td className="px-4 py-3 text-gray-500 max-w-[180px] truncate">
                  {customer.last_milestone || '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
