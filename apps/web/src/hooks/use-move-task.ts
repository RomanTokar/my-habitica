import { useMutation, useQueryClient } from '@tanstack/react-query';
import { arrayMove } from '@dnd-kit/sortable';
import api from '@/lib/axios';
import type { Task, TaskType } from '@my-habitica/shared';

interface MoveTaskVars {
  taskId: string;
  type: TaskType;
  oldIndex: number;
  newIndex: number;
}

export function useMoveTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ taskId, newIndex }: MoveTaskVars) => {
      await api.post(`/tasks/${taskId}/move/${newIndex}`);
    },
    onMutate: async ({ type, oldIndex, newIndex }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', type] });
      const previous = queryClient.getQueryData<Task[]>(['tasks', type]);
      queryClient.setQueryData<Task[]>(['tasks', type], (old) =>
        old ? arrayMove(old, oldIndex, newIndex) : old
      );
      return { previous, type };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['tasks', context.type], context.previous);
      }
    },
    onSettled: (_data, _error, { type }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', type] });
    },
  });
}
