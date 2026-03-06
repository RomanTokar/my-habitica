import { useState } from 'react';
import { Plus, Loader2, Trash2, Repeat, Sun, CheckSquare, Gift } from 'lucide-react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { TaskType, TodoTask } from '@my-habitica/shared';
import { useTasks, useClearCompletedTodos } from '@/hooks/use-tasks';
import { Button } from '@/components/ui/button';
import { SortableTaskCard } from './SortableTaskCard';
import { TaskForm } from './TaskForm';
import type { LucideIcon } from 'lucide-react';

interface TaskColumnProps {
  type: TaskType;
}

interface ColumnConfig {
  label: string;
  accentBorder: string;
  accentText: string;
  Icon: LucideIcon;
  emptyMsg: string;
}

const COLUMN_CONFIG: Record<TaskType, ColumnConfig> = {
  habit: {
    label: 'Habits',
    accentBorder: 'border-t-blue-500',
    accentText: 'text-blue-500',
    Icon: Repeat,
    emptyMsg: 'No habits yet. Add one to start tracking!',
  },
  daily: {
    label: 'Dailies',
    accentBorder: 'border-t-teal-500',
    accentText: 'text-teal-500',
    Icon: Sun,
    emptyMsg: 'No dailies yet. Add tasks you want to do every day!',
  },
  todo: {
    label: 'To-Dos',
    accentBorder: 'border-t-indigo-500',
    accentText: 'text-indigo-500',
    Icon: CheckSquare,
    emptyMsg: "No to-dos yet. Add tasks you want to complete!",
  },
  reward: {
    label: 'Rewards',
    accentBorder: 'border-t-amber-500',
    accentText: 'text-amber-500',
    Icon: Gift,
    emptyMsg: 'No rewards yet. Add something to spend your gold on!',
  },
} as const;

export function TaskColumn({ type }: TaskColumnProps) {
  const [addOpen, setAddOpen] = useState(false);
  const { data: tasks, isLoading, isError } = useTasks(type);
  const clearCompleted = useClearCompletedTodos();

  const config = COLUMN_CONFIG[type];
  const { Icon } = config;
  const hasCompletedTodos =
    type === 'todo' &&
    tasks?.some((t) => t.type === 'todo' && (t as TodoTask).completed);

  const taskIds = tasks?.map((t) => t.id) ?? [];

  return (
    <>
      <div className="flex flex-col gap-3">
        {/* Column header */}
        <div className={`rounded-lg border border-zinc-200 border-t-2 ${config.accentBorder} bg-zinc-50/80 px-3 py-2.5`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Icon className={`h-4 w-4 shrink-0 ${config.accentText}`} />
              <h2 className="font-semibold text-sm text-zinc-800">
                {config.label}
              </h2>
              {tasks && (
                <span className="rounded-full bg-zinc-200/60 px-1.5 py-0.5 text-xs font-medium text-zinc-500">
                  {tasks.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {hasCompletedTodos && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearCompleted.mutate()}
                  disabled={clearCompleted.isPending}
                  title="Clear completed to-dos"
                  className="h-7 gap-1 text-xs text-zinc-500 hover:text-red-600"
                >
                  {clearCompleted.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                  Clear done
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAddOpen(true)}
                className="h-7 gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
          </div>
        </div>

        {/* Task list */}
        <div className="sortable-container flex flex-col gap-2 min-h-[120px]">
          {isLoading && (
            <div className="flex items-center justify-center py-8 text-zinc-400">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}

          {isError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600">
              Failed to load tasks. Please try again.
            </div>
          )}

          {!isLoading && !isError && tasks && tasks.length === 0 && (
            <div className="rounded-lg border border-dashed border-zinc-300 bg-white/50 p-6 text-center">
              <p className="text-sm text-zinc-400">{config.emptyMsg}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAddOpen(true)}
                className="mt-2 text-xs text-zinc-500 hover:text-zinc-900"
              >
                <Plus className="h-3.5 w-3.5" />
                Add {config.label.slice(0, -1)}
              </Button>
            </div>
          )}

          {!isLoading && tasks && (
            <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
              {tasks.map((task) => (
                <SortableTaskCard key={task.id} task={task} />
              ))}
            </SortableContext>
          )}
        </div>
      </div>

      <TaskForm
        open={addOpen}
        onOpenChange={setAddOpen}
        type={type}
      />
    </>
  );
}
