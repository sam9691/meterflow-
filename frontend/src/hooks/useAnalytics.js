import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../api/analytics.api';

export const useDashboardStats = () =>
  useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => analyticsApi.getDashboardStats().then((r) => r.data.data.stats),
    refetchInterval: 60000, // refresh every minute
  });

export const useRequestsOverTime = (params) =>
  useQuery({
    queryKey: ['analytics', 'requests-over-time', params],
    queryFn: () => analyticsApi.getRequestsOverTime(params).then((r) => r.data.data.data),
  });

export const useTopEndpoints = (params) =>
  useQuery({
    queryKey: ['analytics', 'top-endpoints', params],
    queryFn: () => analyticsApi.getTopEndpoints(params).then((r) => r.data.data.data),
  });

export const useStatusCodes = (params) =>
  useQuery({
    queryKey: ['analytics', 'status-codes', params],
    queryFn: () => analyticsApi.getStatusCodes(params).then((r) => r.data.data.data),
  });

export const useLatencyStats = (params) =>
  useQuery({
    queryKey: ['analytics', 'latency', params],
    queryFn: () => analyticsApi.getLatencyStats(params).then((r) => r.data.data),
  });

export const useRecentActivity = (params) =>
  useQuery({
    queryKey: ['analytics', 'activity', params],
    queryFn: () => analyticsApi.getRecentActivity(params).then((r) => r.data),
    refetchInterval: 30000,
  });

export const useApiAnalytics = (apiId, params) =>
  useQuery({
    queryKey: ['analytics', 'api', apiId, params],
    queryFn: () => analyticsApi.getApiAnalytics(apiId, params).then((r) => r.data.data.analytics),
    enabled: !!apiId,
  });
