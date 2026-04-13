import { useState } from 'react';
import { Plus, Webhook, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import apiClient from '../api/axios';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import { formatRelative, getErrorMessage } from '../utils/helpers';

const EVENTS = [
  'usage.threshold_reached',
  'payment.success',
  'payment.failed',
  'billing.generated',
  'api.key_created',
  'api.key_revoked',
  'subscription.upgraded',
  'subscription.downgraded',
];

export default function WebhooksPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newWebhook, setNewWebhook] = useState(null);
  const [form, setForm] = useState({ name: '', url: '', events: [] });

  const { data, isLoading } = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => apiClient.get('/webhooks').then((r) => r.data.data.webhooks),
  });

  const createMutation = useMutation({
    mutationFn: (data) => apiClient.post('/webhooks', data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['webhooks'] });
      setNewWebhook(res.data.data.webhook);
      setShowCreate(false);
      setForm({ name: '', url: '', events: [] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => apiClient.delete(`/webhooks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Webhook deleted');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const toggleEvent = (event) => {
    setForm((f) => ({
      ...f,
      events: f.events.includes(event)
        ? f.events.filter((e) => e !== event)
        : [...f.events, event],
    }));
  };

  const webhooks = data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Webhooks</h1>
          <p className="text-dark-400 mt-1">Get notified when events happen in your account</p>
        </div>
        <Button icon={Plus} onClick={() => setShowCreate(true)}>
          Add Webhook
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="card h-24 skeleton" />)}
        </div>
      ) : webhooks.length === 0 ? (
        <EmptyState
          icon={Webhook}
          title="No webhooks configured"
          description="Add a webhook URL to receive real-time notifications for billing, usage, and API events."
          action={<Button icon={Plus} onClick={() => setShowCreate(true)}>Add Webhook</Button>}
        />
      ) : (
        <div className="space-y-3">
          {webhooks.map((wh, i) => (
            <motion.div
              key={wh._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-white">{wh.name}</h3>
                    <span className={`badge ${wh.isActive ? 'badge-green' : 'badge-gray'}`}>
                      {wh.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {wh.failureCount > 0 && (
                      <span className="badge badge-red">{wh.failureCount} failures</span>
                    )}
                  </div>
                  <p className="text-sm font-mono text-dark-400 mb-3">{wh.url}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {wh.events.map((ev) => (
                      <span key={ev} className="badge badge-blue text-xs">{ev}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span className="text-xs text-dark-500">{formatRelative(wh.createdAt)}</span>
                  <button
                    onClick={() => {
                      if (confirm('Delete this webhook?')) deleteMutation.mutate(wh._id);
                    }}
                    className="p-1.5 rounded text-dark-400 hover:text-red-400 hover:bg-dark-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Webhook" size="lg">
        <div className="space-y-4">
          <Input
            label="Name"
            placeholder="My Webhook"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Endpoint URL"
            placeholder="https://your-server.com/webhook"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
          />
          <div>
            <label className="label">Events to subscribe</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {EVENTS.map((ev) => (
                <label key={ev} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-dark-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={form.events.includes(ev)}
                    onChange={() => toggleEvent(ev)}
                    className="rounded border-dark-600 bg-dark-800 text-brand-600"
                  />
                  <span className="text-xs text-dark-300 font-mono">{ev}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" className="flex-1 justify-center" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              className="flex-1 justify-center"
              loading={createMutation.isPending}
              disabled={!form.name || !form.url || form.events.length === 0}
              onClick={() => createMutation.mutate(form)}
            >
              Create Webhook
            </Button>
          </div>
        </div>
      </Modal>

      {/* Secret display modal */}
      <Modal isOpen={!!newWebhook} onClose={() => setNewWebhook(null)} title="Webhook Created">
        <div className="space-y-4">
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-sm text-yellow-400 font-medium">⚠ Save your webhook secret</p>
            <p className="text-xs text-yellow-400/70 mt-1">This secret is used to verify webhook signatures. It won't be shown again.</p>
          </div>
          <div className="bg-dark-900 rounded-lg p-4 border border-dark-700">
            <p className="text-xs text-dark-400 mb-1">Signing Secret</p>
            <code className="text-sm font-mono text-emerald-400 break-all">{newWebhook?.secret}</code>
          </div>
          <Button className="w-full justify-center" onClick={() => setNewWebhook(null)}>
            I've saved the secret
          </Button>
        </div>
      </Modal>
    </div>
  );
}
