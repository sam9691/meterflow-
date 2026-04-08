import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../api/auth.api';
import { useAuthStore } from '../store/authStore';
import { getErrorMessage } from '../utils/helpers';

export const useAuth = () => {
  const { user, isAuthenticated, login, logout, updateUser } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (res) => {
      const { user, accessToken } = res.data.data;
      login(user, accessToken);
      toast.success('Welcome to MeterFlow!');
      navigate('/dashboard');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (res) => {
      const { user, accessToken } = res.data.data;
      login(user, accessToken);
      toast.success(`Welcome back, ${user.name}!`);
      navigate('/dashboard');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      logout();
      queryClient.clear();
      navigate('/login');
      toast.success('Logged out successfully');
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (res) => {
      updateUser(res.data.data.user);
      toast.success('Profile updated');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const changePasswordMutation = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => {
      toast.success('Password changed. Please login again.');
      logout();
      navigate('/login');
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  return {
    user,
    isAuthenticated,
    register: registerMutation.mutate,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    updateProfile: updateProfileMutation.mutate,
    changePassword: changePasswordMutation.mutate,
    isRegistering: registerMutation.isPending,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
  };
};
