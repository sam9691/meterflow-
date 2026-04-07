import apiClient from './axios';

export const billingApi = {
  getPlans: () => apiClient.get('/billing/plans'),
  getCurrentUsage: () => apiClient.get('/billing/usage'),
  getBillingHistory: (params) => apiClient.get('/billing/history', { params }),
  getInvoices: (params) => apiClient.get('/billing/invoices', { params }),
  getSubscription: () => apiClient.get('/billing/subscription'),
  createCheckoutSession: (data) => apiClient.post('/billing/checkout', data),
  createPortalSession: (data) => apiClient.post('/billing/portal', data),
};
