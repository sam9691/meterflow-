import { Outlet, Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-dark-900 via-dark-900 to-brand-950 border-r border-dark-700 flex-col justify-between p-12 relative overflow-hidden">
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-30" />

        {/* Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />

        <div className="relative">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">MeterFlow</span>
          </Link>
        </div>

        <div className="relative space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-4xl font-bold text-white leading-tight">
              API Billing &<br />
              <span className="text-gradient">Metering Platform</span>
            </h1>
            <p className="text-dark-400 mt-4 text-lg leading-relaxed">
              Build, deploy, and monetize your APIs with usage-based billing, real-time analytics, and enterprise-grade infrastructure.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-2 gap-4"
          >
            {[
              { label: 'API Gateway', desc: 'Proxy & validate all requests' },
              { label: 'Usage Metering', desc: 'Track every API call' },
              { label: 'Dynamic Billing', desc: 'Pay-as-you-go pricing' },
              { label: 'Real-time Analytics', desc: 'Latency, errors, trends' },
            ].map((f) => (
              <div key={f.label} className="bg-dark-800/50 border border-dark-700 rounded-xl p-4">
                <p className="text-sm font-semibold text-white">{f.label}</p>
                <p className="text-xs text-dark-400 mt-1">{f.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="relative text-xs text-dark-500">
          © 2024 MeterFlow. Enterprise API Infrastructure.
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-white">MeterFlow</span>
          </div>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
