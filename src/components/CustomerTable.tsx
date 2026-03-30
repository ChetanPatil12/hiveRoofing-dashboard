'use client';

import {
  type Customer,
  STATUS_LABEL,
  STATUS_STYLE,
  countStepsConfirmed,
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

function StarRating({ rating }: { rating: string }) {
  const n = parseInt(rating, 10);
  if (!n || isNaN(n)) return <span className="text-gray-400 text-xs">—</span>;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`w-3.5 h-3.5 ${i <= n ? 'text-yellow-400' : 'text-gray-200'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
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
              Rating
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
                  <StarRating rating={customer.initial_rating} />
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
