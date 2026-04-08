import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { apisApi } from '../api/apis.api';
import { getErrorMessage } from '../utils/helpers';

export const useMyApis = (params) =>
  useQuery({
    queryKey: ['apis', 'my', params],
    queryFn: () => apisApi.getMyApis(params).then((r) => r.data),
  });

export const usePublicApis = (params) =>
  useQuery({
    queryKey: ['apis', 'public', params],
    queryFn: () => apisApi.getPublicApis(params).then((r) => r.data),
  });

export const useApi = (id) =>
  useQuery({
    queryKey: ['apis', id],
    queryFn: () => apisApi.getApiById(id).then((r) => r.data),
    enabled: !!id,
  });

export const useCreateApi = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apisApi.createApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['apis'] });
      toast.success('API created successfully');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
};

export const useUpdateApi = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => apisApi.updateApi(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['apis', id] });
      qc.invalidateQueries({ queryKey: ['apis', 'my'] });
      toast.success('API updated');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
};

export const useDeleteApi = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apisApi.deleteApi,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['apis'] });
      toast.success('API deleted');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
};

export const useApiKeys = (apiId, params) =>
  useQuery({
    queryKey: ['apiKeys', apiId, params],
    queryFn: () => apisApi.getApiKeys(apiId, params).then((r) => r.data),
    enabled: !!apiId,
  });

export const useMyKeys = (params) =>
  useQuery({
    queryKey: ['apiKeys', 'my', params],
    queryFn: () => apisApi.getMyKeys(params).then((r) => r.data),
  });

export const useCreateApiKey = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ apiId, data }) => apisApi.createApiKey(apiId, data),
    onSuccess: (_, { apiId }) => {
      qc.invalidateQueries({ queryKey: ['apiKeys', apiId] });
      qc.invalidateQueries({ queryKey: ['apiKeys', 'my'] });
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
};

export const useRevokeKey = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apisApi.revokeKey,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['apiKeys'] });
      toast.success('API key revoked');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
};

export const useRotateKey = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: apisApi.rotateKey,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['apiKeys'] });
      toast.success('API key rotated');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });
};
