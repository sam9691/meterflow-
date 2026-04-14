import { useState } from 'react';
import { Globe, Search, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePublicApis } from '../hooks/useApis';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import EmptyState from '../components/ui/EmptyState';
import { formatNumber } from '../utils/helpers';

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'finance', label: 'Finance' },
  { value: 'weather', label: 'Weather' },
  { value: 'social', label: 'Social' },
  { value: 'ecommerce', label: 'E-Commerce' },
  { value: 'health', label: 'Health' },
  { value: 'ai', label: 'AI / ML' },
  { value: 'data', label: 'Data' },
  { value: 'other', label: 'Other' },
];

export default function MarketplacePage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const { data, isLoading } = usePublicApis({ search, category });
  const apis = data?.data?.apis || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">API Marketplace</h1>
        <p className="text-dark-400 mt-1">Discover and connect to public APIs</p>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Search APIs..."
          icon={Search}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={CATEGORIES}
          className="w-48"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card h-48 skeleton" />
          ))}
        </div>
      ) : apis.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="No public APIs found"
          description="No APIs match your search. Try different keywords or browse all categories."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {apis.map((api, i) => (
            <motion.div
              key={api._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card hover:border-dark-600 transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-brand-600/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-5 h-5 text-brand-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-sm truncate">{api.name}</h3>
                  <p className="text-xs text-dark-400 capitalize">{api.category} · by {api.ownerId?.name}</p>
                </div>
              </div>
              {api.description && (
                <p className="text-xs text-dark-400 mb-4 line-clamp-2">{api.description}</p>
              )}
              <div className="flex items-center justify-between text-xs text-dark-500">
                <span>{formatNumber(api.totalRequests)} total requests</span>
                <span className="badge badge-green">Public</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
