import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { tasks, users, type TaskRow } from '../db/schema';
import { scoreDaily } from '@my-habitica/shared';
import type { UserRow } from '../db/schema';
import type { RepeatMap } from '@my-habitica/shared';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the start of today (UTC) — midnight 00:00:00.000Z
 */
function startOfTodayUTC(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

/**
 * Determines whether a daily task is due on the given date.
 */
function isDailyDue(task: TaskRow, today: Date): boolean {
  const frequency = task.frequency ?? 'weekly';

  if (frequency === 'weekly') {
    const repeat = (task.repeat ?? {}) as RepeatMap;
    // getUTCDay(): 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
    const dayIndex = today.getUTCDay();
    const dayKeys: (keyof RepeatMap)[] = ['su', 'm', 't', 'w', 'th', 'f', 's'];
    const key = dayKeys[dayIndex];
    return repeat[key] === true;
  }

  if (frequency === 'daily') {
    const startDate = task.startDate ? new Date(task.startDate) : new Date(task.createdAt!);
    const startUTC = new Date(
      Date.UTC(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth(),
        startDate.getUTCDate(),
      ),
    );
    const msPerDay = 86400000;
    const daysSinceStart = Math.floor(
      (today.getTime() - startUTC.getTime()) / msPerDay,
    );
    const everyX = task.everyX ?? 1;
    return daysSinceStart >= 0 && daysSinceStart % everyX === 0;
  }

  if (frequency === 'monthly') {
    const startDate = task.startDate ? new Date(task.startDate) : new Date(task.createdAt!);
    const startDay = startDate.getUTCDate();
    // Get the last day of the current month
    const lastDayOfMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)).getUTCDate();
    // If startDay > lastDayOfMonth, treat it as due on the last day of the month
    const effectiveDay = Math.min(startDay, lastDayOfMonth);
    return today.getUTCDate() === effectiveDay;
  }

  if (frequency === 'yearly') {
    const startDate = task.startDate ? new Date(task.startDate) : new Date(task.createdAt!);
    return (
      today.getUTCMonth() === startDate.getUTCMonth() &&
      today.getUTCDate() === startDate.getUTCDate()
    );
  }

  return true;
}

/**
 * Reset a single daily task (mark incomplete, reset checklist items).
 */
function buildDailyReset(task: TaskRow, today: Date) {
  const due = isDailyDue(task, today);
  // Reset checklist items' completed state
  type ChecklistItem = { id: string; text: string; completed: boolean };
  const checklist = ((task.checklist as ChecklistItem[]) ?? []).map(
    (item: ChecklistItem) => ({ ...item, completed: false }),
  );

  return {
    completed: false,
    checklist,
    isDue: due,
    updatedAt: new Date(),
  };
}

/**
 * Determine whether habit counters should be reset based on habitFrequency.
 * Returns true if the last cron was in a previous period.
 */
function shouldResetHabitCounters(
  task: TaskRow,
  lastCron: Date,
  today: Date,
): boolean {
  const frequency = task.habitFrequency ?? 'weekly';

  if (frequency === 'daily') {
    // Different calendar day
    return (
      lastCron.getUTCFullYear() !== today.getUTCFullYear() ||
      lastCron.getUTCMonth() !== today.getUTCMonth() ||
      lastCron.getUTCDate() !== today.getUTCDate()
    );
  }

  if (frequency === 'weekly') {
    // Different ISO week: compare year+week number
    const getISOWeek = (d: Date) => {
      // ISO-8601: week starts on Monday, week 1 contains the year's first Thursday
      const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      // Set to nearest Thursday: current date + 4 - current day number (Mon=1, Sun=7)
      const dayNum = date.getUTCDay() || 7;
      date.setUTCDate(date.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
      return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    };
    return (
      lastCron.getUTCFullYear() !== today.getUTCFullYear() ||
      getISOWeek(lastCron) !== getISOWeek(today)
    );
  }

  if (frequency === 'monthly') {
    return (
      lastCron.getUTCFullYear() !== today.getUTCFullYear() ||
      lastCron.getUTCMonth() !== today.getUTCMonth()
    );
  }

  return false;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

@Injectable()
export class CronMiddleware implements NestMiddleware {
  private readonly logger = new Logger(CronMiddleware.name);

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    // Only run for authenticated requests where Passport has populated req.user
    const user = (req as Request & { user?: UserRow }).user;

    if (!user) {
      return next();
    }

    const todayStart = startOfTodayUTC();

    // Skip if cron already ran today
    if (user.lastCron >= todayStart) {
      return next();
    }

    this.logger.log(`Running daily cron for user ${user.id}`);

    try {
      await this.runCron(user, todayStart);
    } catch (err) {
      // Log but don't block the request
      this.logger.error(`Cron failed for user ${user.id}: ${String(err)}`);
    }

    next();
  }

  private async runCron(user: UserRow, today: Date): Promise<void> {
    // Fetch all user tasks
    const userTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, user.id));

    const dailies = userTasks.filter((t) => t.type === 'daily');
    const habits = userTasks.filter((t) => t.type === 'habit');

    // --- Process dailies ---
    const penaltyUpdates: Promise<unknown>[] = [];
    const resetUpdates: Promise<unknown>[] = [];

    // Penalties apply for tasks that were due YESTERDAY (the day that just ended)
    const yesterday = new Date(today.getTime() - 86400000);

    for (const daily of dailies) {
      // Apply penalty for missed (due + incomplete) dailies
      if (isDailyDue(daily, yesterday) && !daily.completed) {
        const result = scoreDaily(
          {
            value: daily.value,
            priority: daily.priority,
            completed: false,
          },
          'down',
        );
        penaltyUpdates.push(
          db
            .update(tasks)
            .set({ value: result.newValue })
            .where(eq(tasks.id, daily.id)),
        );
      }

      // Reset daily for the new day
      const resetData = buildDailyReset(daily, today);
      resetUpdates.push(
        db
          .update(tasks)
          .set(resetData)
          .where(eq(tasks.id, daily.id)),
      );
    }

    await Promise.all(penaltyUpdates);
    await Promise.all(resetUpdates);

    // --- Reset habit counters if period elapsed ---
    const habitResets: Promise<unknown>[] = [];
    for (const habit of habits) {
      if (shouldResetHabitCounters(habit, user.lastCron, today)) {
        habitResets.push(
          db
            .update(tasks)
            .set({ counterUp: 0, counterDown: 0, updatedAt: new Date() })
            .where(eq(tasks.id, habit.id)),
        );
      }
    }
    await Promise.all(habitResets);

    // --- Update user lastCron ---
    await db
      .update(users)
      .set({ lastCron: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id));
  }
}
