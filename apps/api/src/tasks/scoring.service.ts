import { BadRequestException, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  scoreHabit,
  scoreDaily,
  scoreTodo,
} from '@my-habitica/shared';
import { db } from '../db';
import { tasks, users, type TaskRow, type UserRow } from '../db/schema';
import type { ScoreDirection } from '@my-habitica/shared';

export interface ScoreTaskResult {
  task: TaskRow;
  goldDelta: number;
  delta: number;
  user: { gold: number };
}

@Injectable()
export class ScoringService {
  /**
   * Score a task in the given direction and update the DB accordingly.
   * Returns the updated task row, gold delta, and new user gold.
   */
  async scoreTask(
    task: TaskRow,
    user: UserRow,
    direction: ScoreDirection,
  ): Promise<ScoreTaskResult> {
    switch (task.type) {
      case 'habit':
        return this.scoreHabitTask(task, user, direction);
      case 'daily':
        return this.scoreDailyTask(task, user, direction);
      case 'todo':
        return this.scoreTodoTask(task, user, direction);
      case 'reward':
        return this.scoreRewardTask(task, user);
      default:
        throw new BadRequestException('Unknown task type');
    }
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async scoreHabitTask(
    task: TaskRow,
    user: UserRow,
    direction: ScoreDirection,
  ): Promise<ScoreTaskResult> {
    const result = scoreHabit(
      {
        value: task.value,
        priority: task.priority,
        up: task.up ?? true,
        down: task.down ?? true,
      },
      direction,
    );

    const counterUpDelta = direction === 'up' ? 1 : 0;
    const counterDownDelta = direction === 'down' ? 1 : 0;

    const [updatedTask] = await db
      .update(tasks)
      .set({
        value: result.newValue,
        counterUp: (task.counterUp ?? 0) + counterUpDelta,
        counterDown: (task.counterDown ?? 0) + counterDownDelta,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, task.id))
      .returning();

    const newGold = Math.max(0, user.gold + result.goldDelta);
    await this.updateUserGold(user.id, newGold);

    return {
      task: updatedTask,
      goldDelta: result.goldDelta,
      delta: result.delta,
      user: { gold: newGold },
    };
  }

  private async scoreDailyTask(
    task: TaskRow,
    user: UserRow,
    direction: ScoreDirection,
  ): Promise<ScoreTaskResult> {
    const result = scoreDaily(
      {
        value: task.value,
        priority: task.priority,
        completed: task.completed ?? false,
      },
      direction,
    );

    const nowCompleted = direction === 'up';
    const newStreak = direction === 'up'
      ? (task.streak ?? 0) + 1
      : Math.max(0, (task.streak ?? 0) - 1);

    const [updatedTask] = await db
      .update(tasks)
      .set({
        value: result.newValue,
        completed: nowCompleted,
        streak: newStreak,
        dateCompleted: nowCompleted ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, task.id))
      .returning();

    const newGold = Math.max(0, user.gold + result.goldDelta);
    await this.updateUserGold(user.id, newGold);

    return {
      task: updatedTask,
      goldDelta: result.goldDelta,
      delta: result.delta,
      user: { gold: newGold },
    };
  }

  private async scoreTodoTask(
    task: TaskRow,
    user: UserRow,
    direction: ScoreDirection,
  ): Promise<ScoreTaskResult> {
    const result = scoreTodo(
      { value: task.value, priority: task.priority },
      direction,
    );

    const nowCompleted = direction === 'up';

    const [updatedTask] = await db
      .update(tasks)
      .set({
        value: result.newValue,
        completed: nowCompleted,
        dateCompleted: nowCompleted ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, task.id))
      .returning();

    const newGold = Math.max(0, user.gold + result.goldDelta);
    await this.updateUserGold(user.id, newGold);

    return {
      task: updatedTask,
      goldDelta: result.goldDelta,
      delta: result.delta,
      user: { gold: newGold },
    };
  }

  private async scoreRewardTask(
    task: TaskRow,
    user: UserRow,
  ): Promise<ScoreTaskResult> {
    const cost = task.value;

    if (cost < 0) {
      throw new BadRequestException('Reward cost must be non-negative');
    }

    if (user.gold < cost) {
      throw new BadRequestException(
        `Not enough gold. Need ${cost}, have ${user.gold}`,
      );
    }

    const newGold = Math.max(0, user.gold - cost);
    await this.updateUserGold(user.id, newGold);

    // Reward tasks don't change in value; reload for consistency
    const [updatedTask] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, task.id))
      .limit(1);

    return {
      task: updatedTask,
      goldDelta: -cost,
      delta: 0,
      user: { gold: newGold },
    };
  }

  private async updateUserGold(userId: string, newGold: number): Promise<void> {
    await db
      .update(users)
      .set({ gold: newGold, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  /**
   * Apply a "missed daily" penalty — used by the cron middleware.
   * Only updates the task's value (no gold effect on penalty).
   */
  async applyDailyPenalty(task: TaskRow): Promise<void> {
    const result = scoreDaily(
      {
        value: task.value,
        priority: task.priority,
        completed: false,
      },
      'down',
    );

    await db
      .update(tasks)
      .set({ value: result.newValue, updatedAt: new Date() })
      .where(eq(tasks.id, task.id));
  }
}
