import { format, formatDistanceToNow } from 'date-fns';

export const formatDate = (date) => {
  if (!date) return '—';
  return format(new Date(date), 'MMM d, yyyy');
};

export const formatDateTime = (date) => {
  if (!date) return '—';
  return format(new Date(date), 'MMM d, yyyy HH:mm');
};

export const formatRelative = (date) => {
  if (!date) return '—';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
};

export const formatNumber = (num) => {
  if (num === null || num === undefined) return '0';
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
};

export const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

export const formatLatency = (ms) => {
  if (!ms) return '0ms';
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.round(ms)}ms`;
};

export const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const getStatusColor = (statusCode) => {
  if (statusCode >= 500) return 'text-red-400';
  if (statusCode >= 400) return 'text-yellow-400';
  if (statusCode >= 300) return 'text-blue-400';
  return 'text-emerald-400';
};

export const getStatusBadgeClass = (statusCode) => {
  if (statusCode >= 500) return 'badge-red';
  if (statusCode >= 400) return 'badge-yellow';
  if (statusCode >= 300) return 'badge-blue';
  return 'badge-green';
};

export const getPlanColor = (plan) => {
  const colors = {
    free: 'badge-gray',
    pro: 'badge-blue',
    enterprise: 'badge-yellow',
  };
  return colors[plan] || 'badge-gray';
};

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

export const truncate = (str, length = 40) => {
  if (!str) return '';
  return str.length > length ? `${str.substring(0, length)}...` : str;
};

export const getErrorMessage = (error) => {
  return (
    error?.response?.data?.message ||
    error?.message ||
    'Something went wrong'
  );
};
