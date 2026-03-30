'use client';

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface Datum {
  name: string;
  value: number;
  color: string;
}

interface Props {
  data: Datum[];
  total: number;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-md px-3 py-2 text-sm">
      <span className="font-medium text-gray-700">{name}:</span>{' '}
      <span className="text-gray-900">{value}</span>
    </div>
  );
}

export default function StatusDonutChart({ data, total }: Props) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius="55%"
          outerRadius="75%"
          paddingAngle={2}
          dataKey="value"
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        {/* Center label rendered via SVG foreignObject isn't reliable — use a label prop instead */}
        <Pie
          data={[{ value: 1 }]}
          cx="50%"
          cy="45%"
          innerRadius={0}
          outerRadius={0}
          dataKey="value"
          label={() => `${total}`}
          labelLine={false}
          isAnimationActive={false}
          fill="transparent"
          stroke="none"
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span className="text-xs text-gray-600">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
