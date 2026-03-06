export type TaskType = 'habit' | 'daily' | 'todo' | 'reward';
export type TaskPriority = '0.1' | '1' | '1.5' | '2';
export type HabitFrequency = 'daily' | 'weekly' | 'monthly';
export type DailyFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface RepeatMap {
  m: boolean;  // Monday
  t: boolean;  // Tuesday
  w: boolean;  // Wednesday
  th: boolean; // Thursday
  f: boolean;  // Friday
  s: boolean;  // Saturday
  su: boolean; // Sunday
}

export interface BaseTask {
  id: string;
  userId: string;
  type: TaskType;
  text: string;
  notes: string;
  value: number;
  priority: TaskPriority;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface HabitTask extends BaseTask {
  type: 'habit';
  up: boolean;
  down: boolean;
  counterUp: number;
  counterDown: number;
  habitFrequency: HabitFrequency;
}

export interface DailyTask extends BaseTask {
  type: 'daily';
  frequency: DailyFrequency;
  everyX: number;
  startDate: string;
  repeat: RepeatMap;
  streak: number;
  isDue: boolean;
  completed: boolean;
  checklist: ChecklistItem[];
}

export interface TodoTask extends BaseTask {
  type: 'todo';
  completed: boolean;
  checklist: ChecklistItem[];
  dueDate?: string;
  dateCompleted?: string;
}

export interface RewardTask extends BaseTask {
  type: 'reward';
}

export type Task = HabitTask | DailyTask | TodoTask | RewardTask;

export type ScoreDirection = 'up' | 'down';
