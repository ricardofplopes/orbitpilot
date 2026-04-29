import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface CapacityChartProps {
  data: { team: string; available: number; committed: number; atRisk: number; unavailable: number }[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-orbit-navy border border-orbit-navy-lighter rounded-lg p-3 shadow-xl">
      <p className="text-sm font-medium text-orbit-light mb-2">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: {entry.value}%
        </p>
      ))}
    </div>
  );
};

const CapacityChart: React.FC<CapacityChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={data.length * 60 + 60}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
        <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748B', fontSize: 12 }} axisLine={{ stroke: '#334155' }} />
        <YAxis type="category" dataKey="team" tick={{ fill: '#F1F5F9', fontSize: 13 }} axisLine={false} tickLine={false} width={80} />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(37, 99, 235, 0.05)' }} />
        <Legend
          wrapperStyle={{ fontSize: 12, color: '#64748B' }}
          iconType="circle"
          iconSize={8}
        />
        <Bar dataKey="committed" name="Committed" stackId="a" fill="#7C3AED" radius={[0, 0, 0, 0]} />
        <Bar dataKey="atRisk" name="At Risk" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} />
        <Bar dataKey="available" name="Available" stackId="a" fill="#2563EB" radius={[0, 0, 0, 0]} />
        <Bar dataKey="unavailable" name="Unavailable" stackId="a" fill="#334155" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default CapacityChart;
