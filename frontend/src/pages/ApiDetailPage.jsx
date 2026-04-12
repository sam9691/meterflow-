import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plus, Key, RefreshCw, XCircle, Copy, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useApi, useApiKeys, useCreateApiKey, useRevokeKey, useRotateKey } from '../hooks/useApis';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { StatusBadge } from '../components/ui/Badge';
import CopyButton from '../components/ui/CopyButton';
import { formatRelative, formatNumber } from '../utils/helpers';

export default function ApiDetailPage() {
  const { id } = useParams();
  const { data: apiData, isLoading } = useApi(id);
  const { data: keysData } = useApiKeys(id);
  const createKey = useCreateApiKey();
  const revokeKey = useRevokeKey();
  const rotateKey = useRotateKey();

  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyData, setNewKeyData] = useState(null);
  const [keyForm, setKeyForm] = useState({ name: '', environment: 'live' });

  const api = apiData?.data?.api;
  const keys = keysData?.data?.keys || [];

  const handleCreateKey = () => {
    createKey.mutate(
      { apiId: id, data: keyForm },
      {
        onSuccess: (res) => {
          setNewKeyData(res.data.data.apiKey);
          setShowCreateKey(false);
          setKeyForm({ name: '', environment: 'live' });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 skeleton" />
        <div className="card h-32 skeleton" />
      </div>
    );
  }

  if (!api) return <div className="text-dark-400">API not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/apis" className="btn-ghost p-2">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">{api.name}</h1>
          <p className="text-dark-400 text-sm mt-0.5">{api.description}</p>
        </div>
        <StatusBadge status={api.status} />
      </div>

      {/* API Info */}
      <div className="card">
        <h3 className="text-sm font-semibold text-white mb-4">Gateway URL</h3>
        <div className="flex items-center gap-2 bg-dark-900 rounded-lg px-4 py-3 border border-dark-700">
          <code className="text-sm text-emerald-400 flex-1 font-mono">
            {window.location.origin}/gateway/{id}/*
          </code>
          <CopyButton text={`${window.location.origin}/gateway/${id}/`} />
        </div>
        <p className="text-xs text-dark-400 mt-2">
          All requests to this URL will be proxied to <span className="text-dark-300 font-mono">{api.baseUrl}</span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Requests', value: formatNumber(api.totalRequests) },
          { label: 'Total Errors', value: formatNumber(api.totalErrors) },
          { label: 'Avg Latency', value: api.avgLatency ? `${Math.round(api.avgLatency)}ms` : '—' },
        ].map((s) => (
          <div key={s.label} className="card text-center">
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-dark-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* API Keys */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-white">API Keys</h3>
          <Button icon={Plus} size="sm" onClick={() => setShowCreateKey(true)}>
            New Key
          </Button>
        </div>

        {keys.length === 0 ? (
          <div className="text-center py-8 text-dark-400 text-sm">
            No API keys yet. Create one to start making requests.
          </div>
        ) : (
          <div className="space-y-3">
            {keys.map((key) => (
              <div key={key._id} className="flex items-center justify-between p-4 bg-dark-900 rounded-xl border border-dark-700">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white">{key.name}</span>
                    <StatusBadge status={key.status} />
                    <span className="badge badge-gray text-xs">{key.environment}</span>
                  </div>
                  <code className="text-xs font-mono text-dark-400">{key.maskedKey}</code>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-xs text-dark-500">{formatRelative(key.createdAt)}</span>
                  <button
                    onClick={() => rotateKey.mutate(key._id)}
                    className="p-1.5 rounded text-dark-400 hover:text-yellow-400 hover:bg-dark-700 transition-colors"
                    title="Rotate key"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Revoke this key? It will stop working immediately.')) {
                        revokeKey.mutate(key._id);
                      }
                    }}
                    className="p-1.5 rounded text-dark-400 hover:text-red-400 hover:bg-dark-700 transition-colors"
                    title="Revoke key"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Key Modal */}
      <Modal isOpen={showCreateKey} onClose={() => setShowCreateKey(false)} title="Create API Key">
        <div className="space-y-4">
          <Input
            label="Key Name"
            placeholder="e.g. Production Key"
            value={keyForm.name}
            onChange={(e) => setKeyForm({ ...keyForm, name: e.target.value })}
          />
          <Select
            label="Environment"
            value={keyForm.environment}
            onChange={(e) => setKeyForm({ ...keyForm, environment: e.target.value })}
            options={[
              { value: 'live', label: 'Live' },
              { value: 'test', label: 'Test' },
            ]}
          />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1 justify-center" onClick={() => setShowCreateKey(false)}>
              Cancel
            </Button>
            <Button className="flex-1 justify-center" loading={createKey.isPending} onClick={handleCreateKey}>
              Generate Key
            </Button>
          </div>
        </div>
      </Modal>

      {/* New Key Display Modal */}
      <Modal isOpen={!!newKeyData} onClose={() => setNewKeyData(null)} title="Your New API Key">
        <div className="space-y-4">
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-sm text-yellow-400 font-medium">⚠ Save this key now</p>
            <p className="text-xs text-yellow-400/70 mt-1">
              This is the only time the full key will be shown. We store only a hashed version.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-dark-900 rounded-lg px-4 py-3 border border-dark-700">
            <code className="text-sm text-emerald-400 flex-1 font-mono break-all">
              {newKeyData?.rawKey}
            </code>
            <CopyButton text={newKeyData?.rawKey || ''} />
          </div>
          <p className="text-xs text-dark-400">
            Use this key in the <code className="text-dark-300">X-API-Key</code> header when making requests to the gateway.
          </p>
          <Button className="w-full justify-center" onClick={() => setNewKeyData(null)}>
            I've saved my key
          </Button>
        </div>
      </Modal>
    </div>
  );
}
