import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { billingApi } from '../api/billing.api';
import { getErrorMessage } from '../utils/helpers';

export const usePlans = () =>
  useQuery({
    queryKey: ['billing', 'plans'],
    queryFn: () => billingApi.getPlans().then((r) => r.data.data.plans),
    staleTime: Infinity,
  });

export const useCurrentUsage = () =>
  useQuery({
    queryKey: ['billing', 'usage'],
    queryFn: () => billingApi.getCurrentUsage().then((r) => r.data.data.usage),
    refetchInterval: 60000,
  });

export const useBillingHistory = (params) =>
  useQuery({
    queryKey: ['billing', 'history', params],
    queryFn: () => billingApi.getBillingHistory(params).then((r) => r.data),
  });

export const useInvoices = (params) =>
  useQuery({
    queryKey: ['billing', 'invoices', params],
    queryFn: () => billingApi.getInvoices(params).then((r) => r.data),
  });

export const useCheckout = () =>
  useMutation({
    mutationFn: billingApi.createCheckoutSession,
    onSuccess: (res) => {
      const { url } = res.data.data;
      if (url) window.location.href = url;
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

export const usePortalSession = () =>
  useMutation({
    mutationFn: billingApi.createPortalSession,
    onSuccess: (res) => {
      const { url } = res.data.data;
      if (url) window.location.href = url;
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
