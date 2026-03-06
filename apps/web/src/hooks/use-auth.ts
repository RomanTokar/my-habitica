import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/axios';
import { queryClient } from '@/lib/query-client';
import type { User, LoginCredentials, RegisterCredentials } from '@my-habitica/shared';

// ── Current user ──────────────────────────────────────────────────────────────

export function useCurrentUser() {
  return useQuery<User>({
    queryKey: ['user'],
    queryFn: async () => {
      const res = await api.get<{ user: User }>('/users/me');
      return res.data.user ?? res.data;
    },
    retry: false,
    staleTime: 1000 * 60, // 1 minute
  });
}

// ── Login ─────────────────────────────────────────────────────────────────────

export function useLogin() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const res = await api.post<{ user: User }>('/auth/login', credentials);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['user'], data.user ?? data);
      navigate('/dashboard');
    },
  });
}

// ── Register ──────────────────────────────────────────────────────────────────

export function useRegister() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (credentials: RegisterCredentials) => {
      const res = await api.post<{ user: User }>('/auth/register', credentials);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['user'], data.user ?? data);
      navigate('/dashboard');
    },
  });
}

// ── Logout ────────────────────────────────────────────────────────────────────

export function useLogout() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
    },
    onSuccess: () => {
      queryClient.clear();
      navigate('/login');
    },
    onError: () => {
      // Even on error, clear local state and redirect
      queryClient.clear();
      navigate('/login');
    },
  });
}

/** Alias for useCurrentUser — use this in components that just need user data */
export const useUser = useCurrentUser;
