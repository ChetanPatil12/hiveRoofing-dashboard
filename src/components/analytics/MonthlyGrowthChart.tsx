'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface Datum {
  label: string;
  customers: number;
}

interface Props {
  data: Datum[];
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-sm">
      <p className="font-medium text-gray-500">{label}</p>
      <p className="text-gray-900">
        <span className="font-semibold">{payload[0].value}</span> new customer{payload[0].value !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

export default function MonthlyGrowthChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#e85d04" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#e85d04" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          width={30}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e85d04', strokeWidth: 1, strokeDasharray: '4 2' }} />
        <Area
          type="monotone"
          dataKey="customers"
          stroke="#e85d04"
          strokeWidth={2}
          fill="url(#growthGradient)"
          dot={{ r: 3, fill: '#e85d04', strokeWidth: 0 }}
          activeDot={{ r: 5, fill: '#e85d04', strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
