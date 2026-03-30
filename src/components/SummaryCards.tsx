'use client';

import type { Customer } from '@/types/customer';

interface Props {
  customers: Customer[];
}

interface CardDef {
  label: string;
  value: number;
  bg: string;
  text: string;
  border: string;
  dot: string;
}

export default function SummaryCards({ customers }: Props) {
  const total = customers.length;
  const completed = customers.filter((c) => c.status === 'completed').length;
  const active = customers.filter((c) => c.status === 'active').length;
  const pending = customers.filter((c) => c.status === 'pending').length;
  const negative = customers.filter((c) => c.status === 'negative_feedback').length;
  const optedOut = customers.filter((c) => c.status === 'opted_out').length;

  const cards: CardDef[] = [
    {
      label: 'Total',
      value: total,
      bg: 'bg-white',
      text: 'text-gray-900',
      border: 'border-gray-200',
      dot: 'bg-gray-400',
    },
    {
      label: 'Active',
      value: active,
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      dot: 'bg-blue-500',
    },
    {
      label: 'Completed',
      value: completed,
      bg: 'bg-green-50',
      text: 'text-green-700',
      border: 'border-green-200',
      dot: 'bg-green-500',
    },
    {
      label: 'Pending',
      value: pending,
      bg: 'bg-gray-50',
      text: 'text-gray-600',
      border: 'border-gray-200',
      dot: 'bg-gray-400',
    },
    {
      label: 'Negative Feedback',
      value: negative,
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      dot: 'bg-red-500',
    },
    {
      label: 'Opted Out',
      value: optedOut,
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      border: 'border-yellow-200',
      dot: 'bg-yellow-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`${card.bg} border ${card.border} rounded-xl p-4 flex flex-col gap-2`}
        >
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${card.dot}`} />
            <span className="text-xs font-medium text-gray-500">{card.label}</span>
          </div>
          <div className={`text-3xl font-bold ${card.text}`}>{card.value}</div>
        </div>
      ))}
    </div>
  );
}
