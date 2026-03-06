import { useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import type { DragStartEvent, DragEndEvent, DragCancelEvent } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useQueryClient } from '@tanstack/react-query';
import { TaskColumn } from './TaskColumn';
import { renderTaskCard } from './renderTaskCard';
import { useMoveTask } from '@/hooks/use-move-task';
import type { Task, TaskType } from '@my-habitica/shared';
import { cn } from '@/lib/utils';

const TABS: { type: TaskType; label: string }[] = [
  { type: 'habit', label: 'Habits' },
  { type: 'daily', label: 'Dailies' },
  { type: 'todo', label: 'To-Dos' },
  { type: 'reward', label: 'Rewards' },
];

export function TaskDashboard() {
  const [activeTab, setActiveTab] = useState<TaskType>('habit');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const moveTask = useMoveTask();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const findTaskAndType = (id: string): { task: Task; type: TaskType } | null => {
    for (const { type } of TABS) {
      const tasks = queryClient.getQueryData<Task[]>(['tasks', type]);
      const task = tasks?.find((t) => t.id === id);
      if (task) return { task, type };
    }
    return null;
  };

  const activeDragItem = activeDragId ? findTaskAndType(activeDragId) : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(event.active.id as string);
    document.body.classList.add('is-dragging');
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDragId(null);
    document.body.classList.remove('is-dragging');

    if (!over || active.id === over.id) return;

    const found = findTaskAndType(active.id as string);
    if (!found) return;

    const tasks = queryClient.getQueryData<Task[]>(['tasks', found.type]);
    if (!tasks) return;

    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    moveTask.mutate({
      taskId: active.id as string,
      type: found.type,
      oldIndex,
      newIndex,
    });
  }

  function handleDragCancel(_event: DragCancelEvent) {
    setActiveDragId(null);
    document.body.classList.remove('is-dragging');
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {/* Mobile tabs */}
      <div className="flex rounded-lg border border-zinc-200 bg-white p-1 lg:hidden mb-4">
        {TABS.map(({ type, label }) => (
          <button
            key={type}
            type="button"
            onClick={() => setActiveTab(type)}
            className={cn(
              'flex-1 rounded-md py-1.5 text-xs font-medium transition-all duration-200',
              activeTab === type
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Mobile: single column view */}
      <div className="lg:hidden">
        <TaskColumn type={activeTab} />
      </div>

      {/* Desktop: 4-column grid */}
      <div className="hidden lg:grid lg:grid-cols-4 lg:gap-4">
        {TABS.map(({ type }) => (
          <TaskColumn key={type} type={type} />
        ))}
      </div>

      {/* Drag overlay — dropAnimation={null} prevents snap-back */}
      <DragOverlay dropAnimation={null}>
        {activeDragItem && (
          <div className="drag-overlay">
            {renderTaskCard(activeDragItem.task)}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
