import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const STATUS_COLORS = {
  '2xx': '#10b981',
  '3xx': '#3b82f6',
  '4xx': '#f59e0b',
  '5xx': '#ef4444',
};

const getStatusGroup = (code) => {
  if (code >= 500) return '5xx';
  if (code >= 400) return '4xx';
  if (code >= 300) return '3xx';
  return '2xx';
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-dark-800 border border-dark-600 rounded-lg p-3 shadow-xl">
      <p className="text-sm text-white font-medium">{payload[0].name}</p>
      <p className="text-xs text-dark-400">{payload[0].value?.toLocaleString()} requests</p>
    </div>
  );
};

export default function StatusCodeChart({ data = [], loading }) {
  // Group by status class
  const grouped = data.reduce((acc, item) => {
    const group = getStatusGroup(item._id);
    acc[group] = (acc[group] || 0) + item.count;
    return acc;
  }, {});

  const chartData = Object.entries(grouped).map(([name, value]) => ({ name, value }));

  if (loading) {
    return (
      <div className="card">
        <div className="h-4 w-40 skeleton mb-4" />
        <div className="h-48 skeleton rounded-full mx-auto w-48" />
      </div>
    );
  }

  return (
    <div className="card">
      <div className="mb-6">
        <h3 className="text-base font-semibold text-white">Status Codes</h3>
        <p className="text-xs text-dark-400 mt-0.5">Response distribution</p>
      </div>
      {chartData.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-dark-400 text-sm">
          No data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={STATUS_COLORS[entry.name] || '#64748b'}
                  stroke="transparent"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}
              iconType="circle"
              iconSize={8}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
