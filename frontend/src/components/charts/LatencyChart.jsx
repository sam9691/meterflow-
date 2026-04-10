import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-800 border border-dark-600 rounded-lg p-3 shadow-xl">
      <p className="text-xs text-dark-400 mb-1">{label}</p>
      <p className="text-sm text-white font-medium">{payload[0].value}ms avg latency</p>
    </div>
  );
};

export default function LatencyChart({ data = [], loading }) {
  const formatted = data.map((d) => ({
    time: d._id || '',
    latency: Math.round(d.avgLatency || 0),
  }));

  if (loading) {
    return (
      <div className="card">
        <div className="h-4 w-32 skeleton mb-4" />
        <div className="h-48 skeleton rounded-lg" />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="mb-6">
        <h3 className="text-base font-semibold text-white">Avg Latency</h3>
        <p className="text-xs text-dark-400 mt-0.5">Response time in milliseconds</p>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={formatted} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="latency" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
