import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Zap, Globe, Lock, MoreVertical, Trash2, Edit, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useMyApis, useCreateApi, useDeleteApi } from '../hooks/useApis';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { StatusBadge } from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { TableSkeleton } from '../components/ui/Skeleton';
import { formatNumber, formatRelative } from '../utils/helpers';

const CATEGORIES = [
  { value: 'other', label: 'Other' },
  { value: 'finance', label: 'Finance' },
  { value: 'weather', label: 'Weather' },
  { value: 'social', label: 'Social' },
  { value: 'ecommerce', label: 'E-Commerce' },
  { value: 'health', label: 'Health' },
  { value: 'maps', label: 'Maps' },
  { value: 'communication', label: 'Communication' },
  { value: 'ai', label: 'AI / ML' },
  { value: 'data', label: 'Data' },
];

export default function ApisPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', baseUrl: '', visibility: 'private', category: 'other' });
  const [errors, setErrors] = useState({});

  const { data, isLoading } = useMyApis();
  const createApi = useCreateApi();
  const deleteApi = useDeleteApi();

  const apis = data?.data?.apis || [];

  const validate = () => {
    const e = {};
    if (!form.name) e.name = 'Name required';
    if (!form.baseUrl) e.baseUrl = 'Base URL required';
    else if (!/^https?:\/\/.+/.test(form.baseUrl)) e.baseUrl = 'Must be a valid URL';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = () => {
    if (!validate()) return;
    createApi.mutate(form, {
      onSuccess: () => {
        setShowCreate(false);
        setForm({ name: '', description: '', baseUrl: '', visibility: 'private', category: 'other' });
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">My APIs</h1>
          <p className="text-dark-400 mt-1">Manage and monitor your API projects</p>
        </div>
        <Button icon={Plus} onClick={() => setShowCreate(true)}>
          New API
        </Button>
      </div>

      {isLoading ? (
        <div className="card"><TableSkeleton rows={4} cols={5} /></div>
      ) : apis.length === 0 ? (
        <EmptyState
          icon={Zap}
          title="No APIs yet"
          description="Create your first API to start tracking usage and generating API keys."
          action={
            <Button icon={Plus} onClick={() => setShowCreate(true)}>
              Create your first API
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {apis.map((api, i) => (
            <motion.div
              key={api._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card hover:border-dark-600 transition-all duration-200 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-600/10 border border-brand-500/20 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-brand-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-sm">{api.name}</h3>
                    <p className="text-xs text-dark-400 capitalize">{api.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <StatusBadge status={api.status} />
                  {api.visibility === 'public' ? (
                    <Globe className="w-3.5 h-3.5 text-dark-400 ml-1" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-dark-400 ml-1" />
                  )}
                </div>
              </div>

              {api.description && (
                <p className="text-xs text-dark-400 mb-3 line-clamp-2">{api.description}</p>
              )}

              <div className="text-xs font-mono text-dark-500 bg-dark-900 rounded-lg px-3 py-2 mb-4 truncate">
                {api.baseUrl}
              </div>

              <div className="flex items-center justify-between text-xs text-dark-400">
                <span>{formatNumber(api.totalRequests)} requests</span>
                <span>{formatRelative(api.createdAt)}</span>
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t border-dark-700">
                <Link
                  to={`/apis/${api._id}`}
                  className="flex-1 btn-secondary text-center text-xs py-1.5"
                >
                  Manage
                </Link>
                <Link
                  to={`/analytics?apiId=${api._id}`}
                  className="btn-ghost text-xs py-1.5 px-3"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                </Link>
                <button
                  onClick={() => {
                    if (confirm(`Delete "${api.name}"? This cannot be undone.`)) {
                      deleteApi.mutate(api._id);
                    }
                  }}
                  className="btn-ghost text-xs py-1.5 px-3 text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create API Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create New API">
        <div className="space-y-4">
          <Input
            label="API Name"
            placeholder="My Awesome API"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={errors.name}
          />
          <Input
            label="Description"
            placeholder="What does this API do?"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input
            label="Base URL"
            placeholder="https://api.example.com"
            value={form.baseUrl}
            onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
            error={errors.baseUrl}
            hint="All gateway requests will be forwarded to this URL"
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Visibility"
              value={form.visibility}
              onChange={(e) => setForm({ ...form, visibility: e.target.value })}
              options={[
                { value: 'private', label: 'Private' },
                { value: 'public', label: 'Public' },
              ]}
            />
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              options={CATEGORIES}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1 justify-center" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button className="flex-1 justify-center" loading={createApi.isPending} onClick={handleCreate}>
              Create API
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
