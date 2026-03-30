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
  platform: string;
  reviews: number;
}

interface Props {
  data: Datum[];
}

const BAR_COLORS = [
  '#e85d04', // Google Review — brand orange
  '#3b82f6', // Facebook — blue
  '#8b5cf6', // Google Video — purple
  '#f59e0b', // BBB — amber
  '#e85d04', // Google w/ Photos — orange (same platform family)
  '#ef4444', // Yelp — red
];

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { value: number; payload: Datum }[];
}) {
  if (!active || !payload?.length) return null;
  const { platform, reviews } = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-sm">
      <p className="font-medium text-gray-700">{platform}</p>
      <p className="text-gray-900">
        <span className="font-semibold">{reviews}</span> confirmed review{reviews !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

export default function ReviewsByPlatformChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" barCategoryGap="25%">
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="platform"
          width={150}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f9fafb' }} />
        <Bar dataKey="reviews" radius={[0, 3, 3, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
