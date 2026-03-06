import { useState } from 'react';
import { TaskColumn } from './TaskColumn';
import type { TaskType } from '@my-habitica/shared';
import { cn } from '@/lib/utils';

const TABS: { type: TaskType; label: string }[] = [
  { type: 'habit', label: 'Habits' },
  { type: 'daily', label: 'Dailies' },
  { type: 'todo', label: 'To-Dos' },
  { type: 'reward', label: 'Rewards' },
];

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<TaskType>('habit');

  return (
    <div>
      {/* Mobile tabs */}
      <div className="flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm lg:hidden mb-4">
        {TABS.map(({ type, label }) => (
          <button
            key={type}
            type="button"
            onClick={() => setActiveTab(type)}
            className={cn(
              'flex-1 rounded-md py-1.5 text-xs font-medium transition-colors',
              activeTab === type
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
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
    </div>
  );
}
