import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import RequestsChart from '../components/charts/RequestsChart';
import StatusCodeChart from '../components/charts/StatusCodeChart';
import LatencyChart from '../components/charts/LatencyChart';
import {
  useRequestsOverTime, useTopEndpoints, useStatusCodes,
  useLatencyStats, useRecentActivity,
} from '../hooks/useAnalytics';
import { formatNumber, formatLatency, formatRelative, getStatusColor } from '../utils/helpers';
import Select from '../components/ui/Select';

const DAY_OPTIONS = [
  { value: '1', label: 'Last 24 hours' },
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
];

export default function AnalyticsPage() {
  const [searchParams] = useSearchParams();
  const apiId = searchParams.get('apiId');
  const [days, setDays] = useState('7');

  const params = { days, ...(apiId ? { apiId } : {}) };

  const { data: requestsData, isLoading: reqLoading } = useRequestsOverTime({ ...params, groupBy: days === '1' ? 'hour' : 'day' });
  const { data: topEndpoints } = useTopEndpoints(params);
  const { data: statusData, isLoading: statusLoading } = useStatusCodes(params);
  const { data: latencyData, isLoading: latencyLoading } = useLatencyStats(params);
  const { data: activity } = useRecentActivity({ limit: 20, ...(apiId ? { apiId } : {}) });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-dark-400 mt-1">Deep dive into your API performance</p>
        </div>
        <Select
          value={days}
          onChange={(e) => setDays(e.target.value)}
          options={DAY_OPTIONS}
          className="w-44"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <RequestsChart data={requestsData} loading={reqLoading} />
        </div>
        <StatusCodeChart data={statusData} loading={statusLoading} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <LatencyChart data={requestsData} loading={latencyLoading} />

        {/* Top Endpoints */}
        <div className="card">
          <h3 className="text-base font-semibold text-white mb-4">Top Endpoints</h3>
          {!topEndpoints?.length ? (
            <div className="text-center py-8 text-dark-400 text-sm">No data available</div>
          ) : (
            <div className="space-y-3">
              {topEndpoints.map((ep, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-brand-400 w-12 text-right">{ep._id?.method}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-dark-300 truncate">{ep._id?.endpoint}</span>
                      <span className="text-xs text-dark-400 ml-2">{formatNumber(ep.requests)}</span>
                    </div>
                    <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-600 rounded-full"
                        style={{ width: `${Math.min(100, (ep.requests / (topEndpoints[0]?.requests || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Activity log */}
      <div className="card">
        <h3 className="text-base font-semibold text-white mb-4">Request Log</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="table-header text-left pb-3">Endpoint</th>
                <th className="table-header text-left pb-3">Method</th>
                <th className="table-header text-left pb-3">Status</th>
                <th className="table-header text-left pb-3">Latency</th>
                <th className="table-header text-left pb-3">IP</th>
                <th className="table-header text-left pb-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800">
              {(activity?.logs || []).map((log) => (
                <tr key={log._id} className="hover:bg-dark-800/50 transition-colors">
                  <td className="table-cell font-mono text-xs max-w-xs truncate">{log.endpoint}</td>
                  <td className="table-cell font-mono text-xs text-brand-400">{log.method}</td>
                  <td className="table-cell">
                    <span className={`font-mono text-xs font-medium ${getStatusColor(log.statusCode)}`}>
                      {log.statusCode}
                    </span>
                  </td>
                  <td className="table-cell text-xs">{formatLatency(log.latency)}</td>
                  <td className="table-cell text-xs text-dark-400 font-mono">{log.ipAddress || '—'}</td>
                  <td className="table-cell text-xs text-dark-400">{formatRelative(log.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!activity?.logs?.length && (
            <div className="text-center py-8 text-dark-400 text-sm">No requests logged yet</div>
          )}
        </div>
      </div>
    </div>
  );
}
