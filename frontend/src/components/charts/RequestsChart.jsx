import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-800 border border-dark-600 rounded-lg p-3 shadow-xl">
      <p className="text-xs text-dark-400 mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-sm">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-dark-300 capitalize">{entry.name}:</span>
          <span className="text-white font-medium">{entry.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

export default function RequestsChart({ data = [], loading }) {
  const formatted = data.map((d) => ({
    ...d,
    time: d._id
      ? (() => {
          try {
            return format(parseISO(d._id), 'HH:mm');
          } catch {
            return d._id;
          }
        })()
      : '',
  }));

  if (loading) {
    return (
      <div className="card">
        <div className="h-4 w-40 skeleton mb-4" />
        <div className="h-64 skeleton rounded-lg" />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-white">Request Volume</h3>
          <p className="text-xs text-dark-400 mt-0.5">Requests and errors over time</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={formatted} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorErrors" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}
            iconType="circle"
            iconSize={8}
          />
          <Area
            type="monotone"
            dataKey="requests"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#colorRequests)"
            dot={false}
            activeDot={{ r: 4, fill: '#3b82f6' }}
          />
          <Area
            type="monotone"
            dataKey="errors"
            stroke="#ef4444"
            strokeWidth={2}
            fill="url(#colorErrors)"
            dot={false}
            activeDot={{ r: 4, fill: '#ef4444' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
