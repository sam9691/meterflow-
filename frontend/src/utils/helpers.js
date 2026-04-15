import { format, formatDistanceToNow } from 'date-fns';

export const formatDate = (d) => (d ? format(new Date(d), 'MMM d, yyyy') : '—');
export const formatDateTime = (d) => (d ? format(new Date(d), 'MMM d, yyyy HH:mm') : '—');
export const formatRelative = (d) => (d ? formatDistanceToNow(new Date(d), { addSuffix: true }) : '—');

export function formatNumber(n) {
  if (n == null) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount || 0);
}

export function formatLatency(ms) {
  if (!ms) return '0ms';
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.round(ms)}ms`;
}

export function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export function getStatusColor(code) {
  if (code >= 500) return 'text-red-400';
  if (code >= 400) return 'text-yellow-400';
  if (code >= 300) return 'text-blue-400';
  return 'text-emerald-400';
}

export function getPlanColor(plan) {
  return { free: 'badge-gray', pro: 'badge-blue', enterprise: 'badge-yellow' }[plan] || 'badge-gray';
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function truncate(str, len = 40) {
  if (!str) return '';
  return str.length > len ? `${str.slice(0, len)}...` : str;
}

export function getErrorMessage(err) {
  return err?.response?.data?.message || err?.message || 'Something went wrong';
}
