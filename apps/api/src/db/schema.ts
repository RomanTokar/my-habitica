import {
  pgTable,
  uuid,
  varchar,
  text,
  real,
  integer,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const taskTypeEnum = pgEnum('task_type', ['habit', 'daily', 'todo', 'reward']);
export const habitFrequencyEnum = pgEnum('habit_frequency', ['daily', 'weekly', 'monthly']);
export const dailyFrequencyEnum = pgEnum('daily_frequency', ['daily', 'weekly', 'monthly', 'yearly']);

// ---------------------------------------------------------------------------
// Users table
// ---------------------------------------------------------------------------

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  username: varchar('username', { length: 30 }).unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  gold: real('gold').notNull().default(0),
  lastCron: timestamp('last_cron', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;

// ---------------------------------------------------------------------------
// Tasks table (single-table inheritance for all task types)
// ---------------------------------------------------------------------------

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: taskTypeEnum('type').notNull(),
    text: varchar('text', { length: 500 }).notNull(),
    notes: text('notes').notNull().default(''),
    value: real('value').notNull().default(0),
    priority: varchar('priority', { length: 4 }).notNull().default('1'),
    position: integer('position').notNull().default(0),

    // Habit-specific
    up: boolean('up').default(true),
    down: boolean('down').default(true),
    counterUp: integer('counter_up').default(0),
    counterDown: integer('counter_down').default(0),
    habitFrequency: habitFrequencyEnum('habit_frequency').default('weekly'),

    // Daily-specific
    frequency: dailyFrequencyEnum('frequency').default('weekly'),
    everyX: integer('every_x').default(1),
    startDate: timestamp('start_date', { withTimezone: true }),
    repeat: jsonb('repeat').default({
      m: true,
      t: true,
      w: true,
      th: true,
      f: true,
      s: false,
      su: false,
    }),
    streak: integer('streak').default(0),
    isDue: boolean('is_due').default(true),

    // Daily + Todo
    completed: boolean('completed').default(false),
    checklist: jsonb('checklist').default([]),

    // Todo-specific
    dueDate: timestamp('due_date', { withTimezone: true }),
    dateCompleted: timestamp('date_completed', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    userTypePositionIdx: index('tasks_user_type_position_idx').on(t.userId, t.type, t.position),
  }),
);

export type TaskRow = typeof tasks.$inferSelect;
export type NewTaskRow = typeof tasks.$inferInsert;

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  tasks: many(tasks),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
}));
