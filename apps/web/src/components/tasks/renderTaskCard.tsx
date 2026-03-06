import type { Task, HabitTask, DailyTask, TodoTask, RewardTask } from '@my-habitica/shared';
import { HabitCard } from './HabitCard';
import { DailyCard } from './DailyCard';
import { TodoCard } from './TodoCard';
import { RewardCard } from './RewardCard';

export function renderTaskCard(task: Task) {
  switch (task.type) {
    case 'habit':
      return <HabitCard task={task as HabitTask} />;
    case 'daily':
      return <DailyCard task={task as DailyTask} />;
    case 'todo':
      return <TodoCard task={task as TodoTask} />;
    case 'reward':
      return <RewardCard task={task as RewardTask} />;
  }
}
