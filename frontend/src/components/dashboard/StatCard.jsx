import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import clsx from 'clsx';

export default function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'blue', index = 0 }) {
  const colorMap = {
    blue: 'text-brand-400 bg-brand-500/10 border-brand-500/20',
    green: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    red: 'text-red-400 bg-red-500/10 border-red-500/20',
    yellow: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  };

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-dark-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="stat-card group"
    >
      <div className="flex items-start justify-between">
        <div className={clsx('p-2.5 rounded-xl border', colorMap[color])}>
          <Icon className="w-5 h-5" />
        </div>
        {trend !== undefined && (
          <div className={clsx('flex items-center gap-1 text-xs font-medium', trendColor)}>
            <TrendIcon className="w-3.5 h-3.5" />
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm font-medium text-dark-300 mt-0.5">{title}</p>
        {subtitle && <p className="text-xs text-dark-500 mt-1">{subtitle}</p>}
      </div>
    </motion.div>
  );
}
