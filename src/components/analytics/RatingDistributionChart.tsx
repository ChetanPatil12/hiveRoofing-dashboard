'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from 'recharts';

interface Datum {
  rating: string;
  count: number;
  color: string;
}

interface Props {
  data: Datum[];
  noRatingCount: number;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { value: number; payload: Datum }[];
}) {
  if (!active || !payload?.length) return null;
  const { rating, count } = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-sm">
      <p className="font-medium text-gray-700">{rating}</p>
      <p className="text-gray-900">
        <span className="font-semibold">{count}</span> customer{count !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

export default function RatingDistributionChart({ data, noRatingCount }: Props) {
  return (
    <div className="flex flex-col h-full">
      <ResponsiveContainer width="100%" height={210}>
        <BarChart data={data} barCategoryGap="40%">
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="rating"
            tick={{ fontSize: 13, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            domain={[0, 'dataMax + 1']}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {noRatingCount > 0 && (
        <p className="text-xs text-gray-400 text-center mt-1">
          {noRatingCount} customer{noRatingCount !== 1 ? 's' : ''} haven&apos;t submitted a rating yet
        </p>
      )}
    </div>
  );
}
