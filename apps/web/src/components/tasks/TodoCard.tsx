import { useState } from 'react';
import { Pencil, Trash2, ChevronDown, ChevronRight, Calendar } from 'lucide-react';
import type { TodoTask, ChecklistItem } from '@my-habitica/shared';
import { useScoreTask, useDeleteTask, useUpdateTask } from '@/hooks/use-tasks';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { TaskForm } from './TaskForm';
import { ConfirmDialog } from './ConfirmDialog';
import { getTaskBorderColor } from './task-colors';
import { cn } from '@/lib/utils';

interface TodoCardProps {
  task: TodoTask;
}

function formatDueDate(dateStr: string): { label: string; isOverdue: boolean } {
  const parsedDateStr = dateStr.slice(0, 10); // e.g. "2026-02-20"
  const due = new Date(parsedDateStr + 'T00:00:00');
  const todayStr = new Date().toISOString().slice(0, 10);
  const today = new Date(todayStr + 'T00:00:00');

  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return { label: 'Due today', isOverdue: false };
  if (diffDays === 1) return { label: 'Due tomorrow', isOverdue: false };
  if (diffDays === -1) return { label: 'Due yesterday', isOverdue: true };
  if (diffDays < 0) return { label: `${Math.abs(diffDays)} days overdue`, isOverdue: true };

  // Format: "Mar 15"
  const label = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return { label, isOverdue: false };
}

export function TodoCard({ task }: TodoCardProps) {
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
      type: 'todo',
    });
  };

  const handleDelete = () => {
    deleteTask.mutate(
      { id: task.id, type: 'todo' },
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
  const hasChecklist = task.checklist && task.checklist.length > 0;
  const completedItems = task.checklist?.filter((i) => i.completed).length ?? 0;
  const dueInfo = task.dueDate ? formatDueDate(task.dueDate) : null;

  return (
    <>
      <div
        className={cn(
          'group relative flex items-start gap-2.5 rounded-lg border border-gray-200',
          'bg-white p-3.5 transition-shadow duration-150 border-l-4',
          'shadow-[0_1px_2px_0_rgb(0_0_0/0.04)] hover:shadow-[0_1px_3px_0_rgb(0_0_0/0.08)]',
          borderColor,
          task.completed && 'opacity-60'
        )}
      >
        {/* Checkbox */}
        <div className="mt-0.5 shrink-0">
          <Checkbox
            checked={task.completed}
            onCheckedChange={handleToggle}
            disabled={scoreTask.isPending}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              'text-sm font-medium text-gray-900 leading-snug break-words',
              task.completed && 'line-through text-gray-400'
            )}
          >
            {task.text}
          </p>

          {task.notes && (
            <p className="mt-0.5 text-xs text-gray-500 line-clamp-2 break-words">
              {task.notes}
            </p>
          )}

          {/* Due date */}
          {dueInfo && !task.completed && (
            <div
              className={cn(
                'mt-1 flex items-center gap-1 text-xs',
                dueInfo.isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'
              )}
            >
              <Calendar className="h-3 w-3" />
              <span>{dueInfo.label}</span>
            </div>
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
        type="todo"
        task={task}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete To-Do"
        description={`Are you sure you want to delete "${task.text}"?`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        confirmVariant="destructive"
      />
    </>
  );
}
