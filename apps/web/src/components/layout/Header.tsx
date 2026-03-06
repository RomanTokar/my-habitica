import { LogOut, Coins, Loader2, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLogout } from '@/hooks/use-auth';
import { useUser } from '@/hooks/use-user';

export function Header() {
  const { data: user } = useUser();
  const logout = useLogout();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-900 text-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-indigo-400" />
          <span className="text-sm font-semibold tracking-tight">my-habitica</span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Gold display */}
          {user && (
            <div className="flex items-center gap-1.5 rounded-md bg-zinc-800 px-3 py-1 text-sm font-semibold">
              <Coins className="h-4 w-4 text-amber-400" />
              <span className="text-amber-300">{user.gold.toFixed(1)}</span>
            </div>
          )}

          {/* Username */}
          {user && (
            <span className="hidden text-sm text-zinc-400 sm:block">
              {user.username}
            </span>
          )}

          {/* Logout */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            {logout.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="hidden sm:inline">Logging out...</span>
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
