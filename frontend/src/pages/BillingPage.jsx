import { Check, Zap, CreditCard, FileText, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePlans, useCurrentUsage, useBillingHistory, useInvoices, useCheckout, usePortalSession } from '../hooks/useBilling';
import { useAuthStore } from '../store/authStore';
import Button from '../components/ui/Button';
import { PlanBadge } from '../components/ui/Badge';
import { formatCurrency, formatNumber, formatDate } from '../utils/helpers';

export default function BillingPage() {
  const { user } = useAuthStore();
  const { data: plans } = usePlans();
  const { data: usage } = useCurrentUsage();
  const { data: invoicesData } = useInvoices();
  const checkout = useCheckout();
  const portal = usePortalSession();

  const invoices = invoicesData?.data?.invoices || [];
  const currentPlan = user?.subscriptionPlan || 'free';

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Billing</h1>
        <p className="text-dark-400 mt-1">Manage your subscription and view usage</p>
      </div>

      {/* Current Usage */}
      {usage && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white">Current Month Usage</h3>
            <PlanBadge plan={currentPlan} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Requests Used', value: formatNumber(usage.totalRequests) },
              { label: 'Included', value: formatNumber(usage.includedRequests) },
              { label: 'Overage', value: formatNumber(usage.overageRequests) },
              { label: 'Est. Total', value: formatCurrency(usage.estimatedTotal) },
            ].map((s) => (
              <div key={s.label} className="text-center p-4 bg-dark-900 rounded-xl border border-dark-700">
                <p className="text-xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-dark-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          <div>
            <div className="flex justify-between text-xs text-dark-400 mb-2">
              <span>Usage: {usage.usagePercent}%</span>
              <span>{formatNumber(usage.totalRequests)} / {formatNumber(usage.includedRequests)}</span>
            </div>
            <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, usage.usagePercent)}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`h-full rounded-full ${
                  usage.usagePercent >= 100 ? 'bg-red-500' :
                  usage.usagePercent >= 80 ? 'bg-yellow-500' : 'bg-brand-500'
                }`}
              />
            </div>
          </div>
          {user?.stripeCustomerId && (
            <div className="mt-4">
              <Button variant="secondary" size="sm" icon={CreditCard} loading={portal.isPending} onClick={() => portal.mutate({})}>
                Manage Payment Methods
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Plans */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(plans || defaultPlans).map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`card relative ${
                plan.name === 'pro' ? 'border-brand-500/50 glow-blue' : ''
              } ${currentPlan === plan.name ? 'border-emerald-500/50' : ''}`}
            >
              {plan.name === 'pro' && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-brand-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}
              {currentPlan === plan.name && (
                <div className="absolute -top-3 right-4">
                  <span className="bg-emerald-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Current Plan
                  </span>
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-bold text-white capitalize">{plan.displayName || plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-bold text-white">
                    {plan.price?.monthly === 0 ? 'Free' : formatCurrency(plan.price?.monthly)}
                  </span>
                  {plan.price?.monthly > 0 && <span className="text-dark-400 text-sm">/month</span>}
                </div>
              </div>

              <ul className="space-y-2 mb-6">
                {(plan.features || []).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-dark-300">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {currentPlan === plan.name ? (
                <Button variant="secondary" className="w-full justify-center" disabled>
                  Current Plan
                </Button>
              ) : plan.name === 'free' ? (
                <Button variant="secondary" className="w-full justify-center" disabled>
                  Downgrade to Free
                </Button>
              ) : (
                <Button
                  className="w-full justify-center"
                  loading={checkout.isPending}
                  onClick={() => checkout.mutate({ plan: plan.name })}
                >
                  Upgrade to {plan.displayName || plan.name}
                </Button>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Invoice History */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-dark-400" />
          <h3 className="text-base font-semibold text-white">Invoice History</h3>
        </div>
        {invoices.length === 0 ? (
          <div className="text-center py-8 text-dark-400 text-sm">No invoices yet</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="table-header text-left pb-3">Invoice</th>
                <th className="table-header text-left pb-3">Period</th>
                <th className="table-header text-left pb-3">Amount</th>
                <th className="table-header text-left pb-3">Status</th>
                <th className="table-header text-left pb-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-800">
              {invoices.map((inv) => (
                <tr key={inv._id} className="hover:bg-dark-800/50">
                  <td className="table-cell font-mono text-xs">{inv.invoiceNumber}</td>
                  <td className="table-cell text-xs">{inv.billingMonth}</td>
                  <td className="table-cell font-medium">{formatCurrency(inv.total)}</td>
                  <td className="table-cell">
                    <span className={`badge ${inv.status === 'paid' ? 'badge-green' : inv.status === 'open' ? 'badge-blue' : 'badge-red'}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="table-cell text-xs text-dark-400">{formatDate(inv.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const defaultPlans = [
  {
    name: 'free', displayName: 'Free', price: { monthly: 0 },
    features: ['1,000 requests/month', '10 req/min rate limit', '2 APIs', '3 API keys', 'Basic analytics'],
  },
  {
    name: 'pro', displayName: 'Pro', price: { monthly: 29 },
    features: ['10,000 requests/month', '100 req/min rate limit', 'Unlimited APIs', 'Unlimited API keys', 'Advanced analytics', 'Webhooks', '$0.50/100 overage'],
  },
  {
    name: 'enterprise', displayName: 'Enterprise', price: { monthly: 199 },
    features: ['100,000 requests/month', '1,000 req/min rate limit', 'Everything in Pro', 'Custom rate limits', 'SLA guarantee', 'Dedicated support', '$0.10/100 overage'],
  },
];
