import { useState } from 'react';
import { Pencil, Trash2, ChevronDown, ChevronRight, Flame } from 'lucide-react';
import type { DailyTask, ChecklistItem } from '@my-habitica/shared';
import { useScoreTask, useDeleteTask, useUpdateTask } from '@/hooks/use-tasks';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { TaskForm } from './TaskForm';
import { ConfirmDialog } from './ConfirmDialog';
import { getTaskBorderColor } from './task-colors';
import { cn } from '@/lib/utils';

interface DailyCardProps {
  task: DailyTask;
}

export function DailyCard({ task }: DailyCardProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const scoreTask = useScoreTask();
  const deleteTask = useDeleteTask();
  const updateTask = useUpdateTask();

  const handleToggle = (checked: boolean) => {
    scoreTask.mutate({
      id: task.id,
      direction: checked ? 'up' : 'down',
      type: 'daily',
    });
  };

  const handleDelete = () => {
    deleteTask.mutate(
      { id: task.id, type: 'daily' },
      { onSuccess: () => setDeleteOpen(false) }
    );
  };

  const handleChecklistItemToggle = (item: ChecklistItem, checked: boolean) => {
    const updatedChecklist = task.checklist.map((i) =>
      i.id === item.id ? { ...i, completed: checked } : i
    );
    updateTask.mutate({ id: task.id, data: { checklist: updatedChecklist } });
  };

  const borderColor = getTaskBorderColor(task.value);
  const isDue = task.isDue;
  const hasChecklist = task.checklist && task.checklist.length > 0;
  const completedItems = task.checklist?.filter((i) => i.completed).length ?? 0;

  return (
    <>
      <div
        className={cn(
          'group relative flex items-start gap-2.5 rounded-lg border border-gray-200',
          'bg-white p-3.5 transition-shadow duration-150 border-l-4',
          'shadow-[0_1px_2px_0_rgb(0_0_0/0.04)] hover:shadow-[0_1px_3px_0_rgb(0_0_0/0.08)]',
          borderColor,
          !isDue && 'opacity-50'
        )}
      >
        {/* Checkbox */}
        <div className="mt-0.5 shrink-0">
          <Checkbox
            checked={task.completed}
            onCheckedChange={handleToggle}
            disabled={scoreTask.isPending || !isDue}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <p
              className={cn(
                'text-sm font-medium text-gray-900 leading-snug break-words flex-1',
                task.completed && 'line-through text-gray-400'
              )}
            >
              {task.text}
            </p>

            {/* Streak badge */}
            {task.streak > 0 && (
              <Badge variant="warning" className="shrink-0 flex items-center gap-0.5">
                <Flame className="h-3 w-3" />
                {task.streak}
              </Badge>
            )}
          </div>

          {task.notes && (
            <p className="mt-0.5 text-xs text-gray-500 line-clamp-2 break-words">
              {task.notes}
            </p>
          )}

          {!isDue && (
            <span className="mt-1 block text-xs text-gray-400 italic">Not due today</span>
          )}

          {/* Checklist toggle */}
          {hasChecklist && (
            <button
              type="button"
              onClick={() => setChecklistOpen((o) => !o)}
              className="mt-1 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              {checklistOpen ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              <span>
                {completedItems}/{task.checklist.length} items
              </span>
            </button>
          )}

          {/* Checklist items */}
          {hasChecklist && checklistOpen && (
            <div className="mt-2 space-y-1 pl-1">
              {task.checklist.map((item) => (
                <label key={item.id} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={item.completed}
                    onCheckedChange={(checked) => handleChecklistItemToggle(item, checked)}
                    className="h-3.5 w-3.5"
                  />
                  <span
                    className={cn(
                      'text-xs text-gray-700',
                      item.completed && 'line-through text-gray-400'
                    )}
                  >
                    {item.text}
                  </span>
                </label>
              ))}
            </div>
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
        type="daily"
        task={task}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Daily"
        description={`Are you sure you want to delete "${task.text}"?`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        confirmVariant="destructive"
      />
    </>
  );
}
