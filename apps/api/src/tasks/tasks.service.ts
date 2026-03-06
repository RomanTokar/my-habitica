import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, inArray, max } from 'drizzle-orm';
import { db } from '../db';
import { tasks, type TaskRow, type NewTaskRow } from '../db/schema';
import type { TaskType } from '@my-habitica/shared';

// ---------------------------------------------------------------------------
// Shape helpers
// ---------------------------------------------------------------------------

function toApiTask(row: TaskRow): Record<string, unknown> {
  return {
    id: row.id,
    type: row.type,
    text: row.text,
    notes: row.notes,
    value: row.value,
    priority: row.priority,
    position: row.position,
    // Habit
    up: row.up,
    down: row.down,
    counterUp: row.counterUp,
    counterDown: row.counterDown,
    habitFrequency: row.habitFrequency,
    // Daily
    frequency: row.frequency,
    everyX: row.everyX,
    startDate: row.startDate?.toISOString() ?? null,
    repeat: row.repeat,
    streak: row.streak,
    isDue: row.isDue,
    // Daily + Todo
    completed: row.completed,
    checklist: row.checklist,
    // Todo
    dueDate: row.dueDate?.toISOString() ?? null,
    dateCompleted: row.dateCompleted?.toISOString() ?? null,
    createdAt: row.createdAt?.toISOString() ?? null,
    updatedAt: row.updatedAt?.toISOString() ?? null,
  };
}

@Injectable()
export class TasksService {
  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  async createTask(
    userId: string,
    data: Partial<NewTaskRow> & { type: TaskType; text: string },
  ): Promise<Record<string, unknown>> {
    // Determine max position for this type so new tasks go to the end
    const [{ maxPos }] = await db
      .select({ maxPos: max(tasks.position) })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.type, data.type)));

    const maxPosition = maxPos ?? -1;

    const insertData: NewTaskRow = {
      userId,
      type: data.type,
      text: data.text,
      notes: data.notes ?? '',
      value: data.value ?? 0,
      priority: data.priority ?? '1',
      position: maxPosition + 1,
      // Habit
      up: data.up ?? true,
      down: data.down ?? true,
      counterUp: 0,
      counterDown: 0,
      habitFrequency: data.habitFrequency ?? 'weekly',
      // Daily
      frequency: data.frequency ?? 'weekly',
      everyX: data.everyX ?? 1,
      startDate: data.type === 'daily'
        ? (data.startDate ? new Date(data.startDate as unknown as string) : new Date())
        : null,
      repeat: data.repeat ?? { m: true, t: true, w: true, th: true, f: true, s: false, su: false },
      streak: 0,
      isDue: true,
      // Shared
      completed: false,
      checklist: data.checklist ?? [],
      dueDate: data.dueDate ? new Date(data.dueDate as unknown as string) : null,
    };

    const [created] = await db.insert(tasks).values(insertData).returning();
    return toApiTask(created);
  }

  async getTasksByType(
    userId: string,
    type: TaskType,
  ): Promise<Record<string, unknown>[]> {
    const rows = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.type, type)))
      .orderBy(asc(tasks.position));

    return rows.map(toApiTask);
  }

  async getTaskById(
    userId: string,
    taskId: string,
  ): Promise<Record<string, unknown>> {
    const task = await this.findAndVerifyOwnership(userId, taskId);
    return toApiTask(task);
  }

  async updateTask(
    userId: string,
    taskId: string,
    data: Partial<NewTaskRow>,
  ): Promise<Record<string, unknown>> {
    await this.findAndVerifyOwnership(userId, taskId);

    // Convert date strings to Date objects if present
    const updateData: Partial<NewTaskRow> = { ...data, updatedAt: new Date() };

    if (typeof updateData.startDate === 'string') {
      updateData.startDate = new Date(updateData.startDate) as unknown as typeof updateData.startDate;
    }
    if (typeof updateData.dueDate === 'string') {
      updateData.dueDate = new Date(updateData.dueDate) as unknown as typeof updateData.dueDate;
    }

    const [updated] = await db
      .update(tasks)
      .set(updateData)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)))
      .returning();

    return toApiTask(updated);
  }

  async deleteTask(userId: string, taskId: string): Promise<{ id: string }> {
    await this.findAndVerifyOwnership(userId, taskId);

    await db
      .delete(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));

    return { id: taskId };
  }

  async clearCompletedTodos(userId: string): Promise<{ deleted: number }> {
    const completedTodos = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, userId),
          eq(tasks.type, 'todo'),
          eq(tasks.completed, true),
        ),
      );

    if (completedTodos.length === 0) {
      return { deleted: 0 };
    }

    const ids = completedTodos.map((t) => t.id);
    await db.delete(tasks).where(and(inArray(tasks.id, ids), eq(tasks.userId, userId)));

    return { deleted: ids.length };
  }

  // ---------------------------------------------------------------------------
  // Reordering
  // ---------------------------------------------------------------------------

  async moveTask(
    userId: string,
    taskId: string,
    targetPosition: number,
  ): Promise<Record<string, unknown>[]> {
    const task = await this.findAndVerifyOwnership(userId, taskId);

    // Get all tasks of same type ordered by position
    const allTasks = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.type, task.type)))
      .orderBy(asc(tasks.position));

    // Remove the task from its current position
    const filtered = allTasks.filter((t) => t.id !== taskId);

    // Clamp target position
    const clampedTarget = Math.max(0, Math.min(targetPosition, filtered.length));

    // Insert task at new position
    filtered.splice(clampedTarget, 0, task);

    // Update all positions in bulk
    await Promise.all(
      filtered.map((t, index) =>
        db
          .update(tasks)
          .set({ position: index, updatedAt: new Date() })
          .where(eq(tasks.id, t.id)),
      ),
    );

    const updated = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.type, task.type)))
      .orderBy(asc(tasks.position));

    return updated.map(toApiTask);
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  async findAndVerifyOwnership(
    userId: string,
    taskId: string,
  ): Promise<TaskRow> {
    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1);

    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    if (task.userId !== userId) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }

    return task;
  }

}
