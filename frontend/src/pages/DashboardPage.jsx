import { Activity, Zap, Key, AlertTriangle, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import StatCard from '../components/dashboard/StatCard';
import RequestsChart from '../components/charts/RequestsChart';
import StatusCodeChart from '../components/charts/StatusCodeChart';
import { StatCardSkeleton } from '../components/ui/Skeleton';
import {
  useDashboardStats,
  useRequestsOverTime,
  useStatusCodes,
  useRecentActivity,
} from '../hooks/useAnalytics';
import { useAuthStore } from '../store/authStore';
import { formatNumber, formatLatency, formatRelative, getStatusColor } from '../utils/helpers';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: requestsData, isLoading: reqLoading } = useRequestsOverTime({ days: 1, groupBy: 'hour' });
  const { data: statusData, isLoading: statusLoading } = useStatusCodes({ days: 7 });
  const { data: activity } = useRecentActivity({ limit: 8 });

  const greeting = getGreeting();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Good {greeting}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-dark-400 mt-1 text-sm">Here's what's happening with your APIs.</p>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              title="Requests This Month"
              value={formatNumber(stats?.totalRequestsThisMonth)}
              subtitle={`${formatNumber(stats?.totalRequestsLast24h)} in last 24h`}
              icon={Activity}
              trend={stats?.monthOverMonthChange}
              color="blue"
              index={0}
            />
            <StatCard
              title="Active API Keys"
              value={formatNumber(stats?.activeApiKeys)}
              subtitle={`Across ${stats?.totalApis} APIs`}
              icon={Key}
              color="green"
              index={1}
            />
            <StatCard
              title="Error Rate"
              value={`${stats?.errorRate || 0}%`}
              subtitle={`${formatNumber(stats?.totalErrorsThisMonth)} errors`}
              icon={AlertTriangle}
              color={stats?.errorRate > 5 ? 'red' : 'yellow'}
              index={2}
            />
            <StatCard
              title="Last 7 Days"
              value={formatNumber(stats?.requestsLast7d)}
              subtitle="Total requests"
              icon={TrendingUp}
              color="purple"
              index={3}
            />
          </>
        )}
      </div>

      {/* charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <RequestsChart data={requestsData} loading={reqLoading} />
        </div>
        <StatusCodeChart data={statusData} loading={statusLoading} />
      </div>

      {/* recent requests */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white">Recent Requests</h3>
          <span className="text-xs text-dark-500">auto-refreshes every 30s</span>
        </div>

        {!activity?.logs?.length ? (
          <div className="py-10 text-center text-dark-400 text-sm">
            No requests yet. Create an API, generate a key, and hit the gateway.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="table-header text-left pb-3">Endpoint</th>
                  <th className="table-header text-left pb-3">Method</th>
                  <th className="table-header text-left pb-3">Status</th>
                  <th className="table-header text-left pb-3">Latency</th>
                  <th className="table-header text-left pb-3">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-800">
                {activity.logs.map((log) => (
                  <motion.tr
                    key={log._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-dark-800/40 transition-colors"
                  >
                    <td className="table-cell font-mono text-xs truncate max-w-xs">{log.endpoint}</td>
                    <td className="table-cell font-mono text-xs text-brand-400">{log.method}</td>
                    <td className="table-cell">
                      <span className={`font-mono text-xs font-semibold ${getStatusColor(log.statusCode)}`}>
                        {log.statusCode}
                      </span>
                    </td>
                    <td className="table-cell text-xs">{formatLatency(log.latency)}</td>
                    <td className="table-cell text-xs text-dark-400">{formatRelative(log.timestamp)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
