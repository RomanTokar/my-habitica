import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import type { Task, TaskType, ScoreDirection } from '@my-habitica/shared';
import type { User } from '@my-habitica/shared';

// ── Fetch tasks by type ───────────────────────────────────────────────────────

export function useTasks(type: TaskType) {
  return useQuery<Task[]>({
    queryKey: ['tasks', type],
    queryFn: async () => {
      const res = await api.get<Task[]>('/tasks', { params: { type } });
      return res.data;
    },
    staleTime: 1000 * 30,
  });
}

// ── Create task ───────────────────────────────────────────────────────────────

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await api.post<Task>('/tasks', data);
      return res.data;
    },
    onSettled: (_data, _error, variables) => {
      const type = variables?.type as TaskType | undefined;
      if (type) {
        queryClient.invalidateQueries({ queryKey: ['tasks', type] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
      }
    },
  });
}

// ── Update task ───────────────────────────────────────────────────────────────

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await api.put<Task>(`/tasks/${id}`, data);
      return res.data;
    },
    onSuccess: (updatedTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', updatedTask.type] });
    },
    onSettled: (_data, _error, variables) => {
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: ['task', variables.id] });
      }
    },
  });
}

// ── Delete task ───────────────────────────────────────────────────────────────

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; type: TaskType }) => {
      await api.delete(`/tasks/${id}`);
      return id;
    },
    onMutate: async ({ id, type }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', type] });
      const previous = queryClient.getQueryData<Task[]>(['tasks', type]);
      queryClient.setQueryData<Task[]>(['tasks', type], (old) =>
        old ? old.filter((t) => t.id !== id) : []
      );
      return { previous, type };
    },
    onError: (_err, { type }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['tasks', type], context.previous);
      }
    },
    onSettled: (_data, _error, { type }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', type] });
    },
  });
}

// ── Score task ────────────────────────────────────────────────────────────────

interface ScoreResponse {
  task: Task;
  user: User;
  delta: number;
}

export function useScoreTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, direction }: { id: string; direction: ScoreDirection; type: TaskType }) => {
      const res = await api.post<ScoreResponse>(`/tasks/${id}/score/${direction}`);
      return res.data;
    },
    onMutate: async ({ id, direction, type }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', type] });
      await queryClient.cancelQueries({ queryKey: ['user'] });

      const previousTasks = queryClient.getQueryData<Task[]>(['tasks', type]);
      const previousUser = queryClient.getQueryData<User>(['user']);

      // Optimistic task update
      queryClient.setQueryData<Task[]>(['tasks', type], (old) => {
        if (!old) return old;
        return old.map((task) => {
          if (task.id !== id) return task;
          if (task.type === 'habit') {
            return {
              ...task,
              counterUp: direction === 'up' ? task.counterUp + 1 : task.counterUp,
              counterDown: direction === 'down' ? task.counterDown + 1 : task.counterDown,
            };
          }
          if (task.type === 'daily' || task.type === 'todo') {
            return { ...task, completed: direction === 'up' };
          }
          return task;
        });
      });

      return { previousTasks, previousUser, type };
    },
    onError: (_err, { type }, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', type], context.previousTasks);
      }
      if (context?.previousUser) {
        queryClient.setQueryData(['user'], context.previousUser);
      }
    },
    onSuccess: (data) => {
      // Update user gold from server response
      if (data.user) {
        queryClient.setQueryData(['user'], data.user);
      }
    },
    onSettled: (_data, _error, { type }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks', type] });
    },
  });
}

// ── Clear completed todos ─────────────────────────────────────────────────────

export function useClearCompletedTodos() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await api.delete('/tasks/completed');
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['tasks', 'todo'] });
      const previous = queryClient.getQueryData<Task[]>(['tasks', 'todo']);
      queryClient.setQueryData<Task[]>(['tasks', 'todo'], (old) =>
        old ? old.filter((t) => 'completed' in t && !t.completed) : []
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['tasks', 'todo'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', 'todo'] });
    },
  });
}
