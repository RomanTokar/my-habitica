/**
 * Maps task.value to Tailwind border color classes.
 * Mirrors Habitica's task value color bands.
 */
export function getTaskBorderColor(value: number): string {
  if (value < -20) return 'border-l-red-700';
  if (value < -10) return 'border-l-red-500';
  if (value < -1) return 'border-l-orange-400';
  if (value < 1) return 'border-l-gray-400';
  if (value < 5) return 'border-l-green-400';
  if (value < 10) return 'border-l-green-500';
  return 'border-l-green-600';
}

/**
 * Maps task.value to faint background tint classes.
 */
export function getTaskBgTint(value: number): string {
  if (value < -20) return 'bg-red-50/30';
  if (value < -10) return 'bg-red-50/20';
  if (value < -1) return 'bg-orange-50/20';
  if (value < 1) return 'bg-gray-50/10';
  if (value < 5) return 'bg-green-50/20';
  if (value < 10) return 'bg-green-50/30';
  return 'bg-green-50/40';
}
