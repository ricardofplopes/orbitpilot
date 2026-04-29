import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface StatusChartProps {
  data: Record<string, number>;
}

const STATUS_COLORS: Record<string, string> = {
  backlog: '#334155',
  todo: '#64748B',
  'in-progress': '#2563EB',
  'in-review': '#7C3AED',
  done: '#10B981',
  blocked: '#EF4444',
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-orbit-navy border border-orbit-navy-lighter rounded-lg p-3 shadow-xl">
      <p className="text-sm text-orbit-light">
        <span className="font-medium">{payload[0].name}</span>: {payload[0].value}
      </p>
    </div>
  );
};

const StatusChart: React.FC<StatusChartProps> = ({ data }) => {
  const chartData = Object.entries(data).map(([name, value]) => ({ name, value }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={3}
          dataKey="value"
          stroke="none"
        >
          {chartData.map((entry) => (
            <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#64748B'} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12, color: '#64748B' }}
          iconType="circle"
          iconSize={8}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default StatusChart;
