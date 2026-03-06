import { useState } from 'react';
import { Pencil, Trash2, Coins, ShoppingCart } from 'lucide-react';
import type { RewardTask } from '@my-habitica/shared';
import { useScoreTask, useDeleteTask } from '@/hooks/use-tasks';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { TaskForm } from './TaskForm';
import { ConfirmDialog } from './ConfirmDialog';
import { cn } from '@/lib/utils';

interface RewardCardProps {
  task: RewardTask;
}

export function RewardCard({ task }: RewardCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);
  const scoreTask = useScoreTask();
  const deleteTask = useDeleteTask();
  const { data: user } = useUser();

  const canAfford = user ? user.gold >= task.value : false;

  const handleBuy = () => {
    scoreTask.mutate(
      { id: task.id, direction: 'up', type: 'reward' },
      { onSuccess: () => setBuyOpen(false) }
    );
  };

  const handleDelete = () => {
    deleteTask.mutate(
      { id: task.id, type: 'reward' },
      { onSuccess: () => setDeleteOpen(false) }
    );
  };

  return (
    <>
      <div
        className="group relative flex items-start gap-2.5 rounded-lg border border-gray-200 bg-white p-3.5 transition-shadow duration-150 border-l-4 border-l-amber-400 shadow-[0_1px_2px_0_rgb(0_0_0/0.04)] hover:shadow-[0_1px_3px_0_rgb(0_0_0/0.08)]"
      >
        {/* Gold icon */}
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 border border-amber-200">
          <Coins className="h-4 w-4 text-amber-500" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 leading-snug break-words">
            {task.text}
          </p>

          {task.notes && (
            <p className="mt-0.5 text-xs text-gray-500 line-clamp-2 break-words">
              {task.notes}
            </p>
          )}

          {/* Gold cost */}
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <Coins className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-sm font-semibold text-amber-600">
                {task.value.toFixed(1)} gold
              </span>
            </div>

            <div className="relative">
              <Button
                variant={canAfford ? 'warning' : 'outline'}
                size="sm"
                onClick={() => {
                  if (canAfford) setBuyOpen(true);
                }}
                disabled={!canAfford || scoreTask.isPending}
                title={
                  !canAfford
                    ? `Not enough gold (need ${task.value.toFixed(1)}, have ${(user?.gold ?? 0).toFixed(1)})`
                    : `Buy for ${task.value.toFixed(1)} gold`
                }
                className={cn(
                  'text-xs active:scale-95',
                  !canAfford && 'opacity-50 cursor-not-allowed'
                )}
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                Buy
              </Button>
            </div>
          </div>

          {/* Not enough gold message */}
          {!canAfford && user && (
            <p className="mt-1 text-xs text-red-500">
              Need {(task.value - user.gold).toFixed(1)} more gold
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 items-start gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setEditOpen(true)}
            title="Edit"
            className="h-6 w-6 text-gray-400 hover:text-indigo-600"
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setDeleteOpen(true)}
            title="Delete"
            className="h-6 w-6 text-gray-400 hover:text-red-600"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      <TaskForm
        open={editOpen}
        onOpenChange={setEditOpen}
        type="reward"
        task={task}
      />

      <ConfirmDialog
        open={buyOpen}
        onOpenChange={setBuyOpen}
        title="Buy Reward"
        description={`Spend ${task.value.toFixed(1)} gold on "${task.text}"?`}
        onConfirm={handleBuy}
        confirmLabel="Buy"
        confirmVariant="warning"
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Reward"
        description={`Are you sure you want to delete "${task.text}"?`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        confirmVariant="destructive"
      />
    </>
  );
}
