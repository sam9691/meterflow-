import { Key, RefreshCw, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMyKeys, useRevokeKey, useRotateKey } from '../hooks/useApis';
import { StatusBadge } from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { TableSkeleton } from '../components/ui/Skeleton';
import { formatRelative, formatNumber } from '../utils/helpers';

export default function KeysPage() {
  const { data, isLoading } = useMyKeys();
  const revokeKey = useRevokeKey();
  const rotateKey = useRotateKey();

  const keys = data?.data?.keys || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">API Keys</h1>
        <p className="text-dark-400 mt-1">All your API keys across all projects</p>
      </div>

      {isLoading ? (
        <div className="card"><TableSkeleton rows={5} cols={5} /></div>
      ) : keys.length === 0 ? (
        <EmptyState
          icon={Key}
          title="No API keys"
          description="Create an API first, then generate keys from the API detail page."
        />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="table-header text-left pb-3">Name</th>
                <th className="table-header text-left pb-3">Key</th>
                <th className="table-header text-left pb-3">API</th>
                <th className="table-header text-left pb-3">Status</th>
                <th className="table-header text-left pb-3">Requests</th>
                <th className="table-header text-left pb-3">Last Used</th>
                <th className="table-header text-left pb-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800">
              {keys.map((key, i) => (
                <motion.tr
                  key={key._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="hover:bg-dark-800/50 transition-colors"
                >
                  <td className="table-cell font-medium">{key.name}</td>
                  <td className="table-cell">
                    <code className="text-xs font-mono text-dark-400">{key.maskedKey}</code>
                  </td>
                  <td className="table-cell text-xs text-dark-400">
                    {key.apiId?.name || '—'}
                  </td>
                  <td className="table-cell">
                    <StatusBadge status={key.status} />
                  </td>
                  <td className="table-cell text-xs">{formatNumber(key.totalRequests)}</td>
                  <td className="table-cell text-xs text-dark-400">
                    {key.lastUsedAt ? formatRelative(key.lastUsedAt) : 'Never'}
                  </td>
                  <td className="table-cell">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => rotateKey.mutate(key._id)}
                        disabled={key.status !== 'active'}
                        className="p-1.5 rounded text-dark-400 hover:text-yellow-400 hover:bg-dark-700 transition-colors disabled:opacity-30"
                        title="Rotate"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Revoke this key?')) revokeKey.mutate(key._id);
                        }}
                        disabled={key.status !== 'active'}
                        className="p-1.5 rounded text-dark-400 hover:text-red-400 hover:bg-dark-700 transition-colors disabled:opacity-30"
                        title="Revoke"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
