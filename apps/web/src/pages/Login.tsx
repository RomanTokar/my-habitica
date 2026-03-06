import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-auth';
import { LoginForm } from '@/components/auth/LoginForm';

export function LoginPage() {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Already logged in
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white text-2xl font-bold shadow-lg">
            H
          </div>
          <h1 className="text-2xl font-bold text-gray-900">my-habitica</h1>
          <p className="mt-1 text-sm text-gray-500">Build better habits, one day at a time</p>
        </div>

        {/* Card */}
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-md">
          <h2 className="mb-5 text-lg font-semibold text-gray-800">Sign in to your account</h2>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
