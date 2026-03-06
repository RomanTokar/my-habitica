import { useState } from 'react';
import { Plus, Minus, Pencil, Trash2 } from 'lucide-react';
import type { HabitTask } from '@my-habitica/shared';
import { useScoreTask, useDeleteTask } from '@/hooks/use-tasks';
import { Button } from '@/components/ui/button';
import { TaskForm } from './TaskForm';
import { getTaskBorderColor } from './task-colors';
import { ConfirmDialog } from './ConfirmDialog';

interface HabitCardProps {
  task: HabitTask;
}

export function HabitCard({ task }: HabitCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const scoreTask = useScoreTask();
  const deleteTask = useDeleteTask();

  const handleScore = (direction: 'up' | 'down') => {
    scoreTask.mutate({ id: task.id, direction, type: 'habit' });
  };

  const handleDelete = () => {
    deleteTask.mutate(
      { id: task.id, type: 'habit' },
      { onSuccess: () => setDeleteOpen(false) }
    );
  };

  const borderColor = getTaskBorderColor(task.value);

  return (
    <>
      <div
        className={`
          group relative flex items-start gap-2 rounded-lg border border-gray-200
          bg-white p-3.5 transition-shadow duration-150
          shadow-[0_1px_2px_0_rgb(0_0_0/0.04)] hover:shadow-[0_1px_3px_0_rgb(0_0_0/0.08)]
          border-l-4 ${borderColor}
        `}
      >
        {/* Score buttons */}
        <div className="flex flex-col gap-1 shrink-0">
          {task.up && (
            <Button
              variant="success"
              size="icon-sm"
              onClick={() => handleScore('up')}
              disabled={scoreTask.isPending}
              title="Score up"
              className="h-7 w-7 active:scale-95"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          )}
          {task.down && (
            <Button
              variant="destructive"
              size="icon-sm"
              onClick={() => handleScore('down')}
              disabled={scoreTask.isPending}
              title="Score down"
              className="h-7 w-7 active:scale-95"
            >
              <Minus className="h-3.5 w-3.5" />
            </Button>
          )}
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

          {/* Counter */}
          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
            {task.up && (
              <span className="flex items-center gap-0.5 text-green-600">
                <span>&#x2191;</span>
                <span>{task.counterUp}</span>
              </span>
            )}
            {task.down && (
              <span className="flex items-center gap-0.5 text-red-500">
                <span>&#x2193;</span>
                <span>{task.counterDown}</span>
              </span>
            )}
          </div>
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

      {/* Edit dialog */}
      <TaskForm
        open={editOpen}
        onOpenChange={setEditOpen}
        type="habit"
        task={task}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Habit"
        description={`Are you sure you want to delete "${task.text}"? This cannot be undone.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        confirmVariant="destructive"
      />
    </>
  );
}
