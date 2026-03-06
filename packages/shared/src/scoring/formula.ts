import type { ScoreDirection } from '../types/task';

/**
 * Simplified Habitica scoring formula.
 * Based on Habitica's scoreTask.js but without stats bonuses (XP, Mana, Crit, Classes).
 */

/** Minimum task value (floor). Derived from Habitica's scoreTask.js. */
const VALUE_MIN = -47.27;
/** Maximum task value (ceiling). Derived from Habitica's scoreTask.js. */
const VALUE_MAX = 21.27;
/** Exponential decay base used in the scoring formula. Derived from Habitica's scoreTask.js. */
const DECAY_BASE = 0.9747;

/**
 * Clamps a value between min and max.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Computes the delta (change in task value) for a score event.
 * This is derived from Habitica's task value formula.
 */
export function computeDelta(taskValue: number, direction: ScoreDirection): number {
  const clamped = clamp(taskValue, VALUE_MIN, VALUE_MAX);
  const baseDelta = Math.pow(DECAY_BASE, clamped);
  return direction === 'up' ? baseDelta : -baseDelta;
}

/**
 * Computes the gold earned from scoring a task.
 * priority is the numeric value of the priority string ('0.1', '1', '1.5', '2').
 */
export function computeGoldEarned(delta: number, priority: string): number {
  const priorityNum = parseFloat(priority);
  const gold = Math.abs(delta) * priorityNum;
  return Math.round(Math.max(0, gold) * 100) / 100;
}

/**
 * Result of scoring a task.
 */
export interface ScoreResult {
  /** New task value after scoring */
  newValue: number;
  /** Gold delta (positive = earned, negative = spent) */
  goldDelta: number;
  /** The raw delta applied */
  delta: number;
}

/**
 * Score a habit task.
 */
export function scoreHabit(task: { value: number; priority: string; up: boolean; down: boolean }, direction: ScoreDirection): ScoreResult {
  if (direction === 'up' && !task.up) {
    return { newValue: task.value, goldDelta: 0, delta: 0 };
  }
  if (direction === 'down' && !task.down) {
    return { newValue: task.value, goldDelta: 0, delta: 0 };
  }

  const delta = computeDelta(task.value, direction);
  const newValue = task.value + delta;
  const goldDelta = direction === 'up' ? computeGoldEarned(delta, task.priority) : 0;

  return { newValue, goldDelta, delta };
}

/**
 * Score a daily task (toggle completed).
 */
export function scoreDaily(task: { value: number; priority: string; completed: boolean }, direction: ScoreDirection): ScoreResult {
  const delta = computeDelta(task.value, direction);
  const newValue = task.value + delta;
  const goldDelta = direction === 'up' ? computeGoldEarned(delta, task.priority) : 0;

  return { newValue, goldDelta, delta };
}

/**
 * Score a todo task.
 */
export function scoreTodo(task: { value: number; priority: string }, direction: ScoreDirection): ScoreResult {
  const delta = computeDelta(task.value, direction);
  const newValue = task.value + delta;
  const goldDelta = direction === 'up' ? computeGoldEarned(delta, task.priority) : 0;

  return { newValue, goldDelta, delta };
}

/**
 * Returns task color class based on value (for UI rendering).
 * Mirrors Habitica's task value color bands.
 */
export function getTaskColor(value: number): 'worst' | 'worse' | 'bad' | 'neutral' | 'good' | 'better' | 'best' {
  if (value < -20) return 'worst';
  if (value < -10) return 'worse';
  if (value < -1) return 'bad';
  if (value < 1) return 'neutral';
  if (value < 5) return 'good';
  if (value < 10) return 'better';
  return 'best';
}

/**
 * Compute the CSS color for a task based on its value.
 */
export function getTaskColorHex(value: number): string {
  const colorMap: Record<ReturnType<typeof getTaskColor>, string> = {
    worst: '#ff0000',
    worse: '#d73a33',
    bad: '#e8a02c',
    neutral: '#9b9b9b',
    good: '#4cb05b',
    better: '#2ea459',
    best: '#1e8d4e',
  };
  return colorMap[getTaskColor(value)];
}
