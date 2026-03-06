import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-auth';
import { AppShell } from '@/components/layout/AppShell';
import { TaskDashboard as DashboardComponent } from '@/components/tasks/TaskDashboard';

export function DashboardPage() {
  const { data: user, isLoading, isError } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          <p className="text-sm text-gray-500">Loading your tasks...</p>
        </div>
      </div>
    );
  }

  // Not authenticated (401 interceptor handles redirect, but keep as fallback)
  if (isError || !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell>
      <DashboardComponent />
    </AppShell>
  );
}
