import { z } from 'zod';

const taskPrioritySchema = z.enum(['0.1', '1', '1.5', '2']);
const habitFrequencySchema = z.enum(['daily', 'weekly', 'monthly']);
const dailyFrequencySchema = z.enum(['daily', 'weekly', 'monthly', 'yearly']);

const checklistItemSchema = z.object({
  id: z.string(),
  text: z.string().min(1).max(500),
  completed: z.boolean(),
});

const repeatMapSchema = z
  .object({
    m: z.boolean(),
    t: z.boolean(),
    w: z.boolean(),
    th: z.boolean(),
    f: z.boolean(),
    s: z.boolean(),
    su: z.boolean(),
  })
  .refine((r) => Object.values(r).some(Boolean), {
    message: 'At least one day must be selected',
  });

export const createHabitSchema = z.object({
  type: z.literal('habit'),
  text: z.string().min(1, 'Task text is required').max(500),
  notes: z.string().max(5000).optional().default(''),
  priority: taskPrioritySchema.optional().default('1'),
  up: z.boolean().optional().default(true),
  down: z.boolean().optional().default(true),
  habitFrequency: habitFrequencySchema.optional().default('weekly'),
});

export const createDailySchema = z.object({
  type: z.literal('daily'),
  text: z.string().min(1, 'Task text is required').max(500),
  notes: z.string().max(5000).optional().default(''),
  priority: taskPrioritySchema.optional().default('1'),
  frequency: dailyFrequencySchema.optional().default('weekly'),
  everyX: z.number().int().min(1).max(365).optional().default(1),
  startDate: z.string().datetime().optional(),
  repeat: repeatMapSchema.optional().default({ m: true, t: true, w: true, th: true, f: true, s: false, su: false }),
  checklist: z.array(checklistItemSchema).optional().default([]),
});

export const createTodoSchema = z.object({
  type: z.literal('todo'),
  text: z.string().min(1, 'Task text is required').max(500),
  notes: z.string().max(5000).optional().default(''),
  priority: taskPrioritySchema.optional().default('1'),
  dueDate: z.string().datetime().optional().nullable(),
  checklist: z.array(checklistItemSchema).optional().default([]),
});

export const createRewardSchema = z.object({
  type: z.literal('reward'),
  text: z.string().min(1, 'Task text is required').max(500),
  notes: z.string().max(5000).optional().default(''),
  value: z.number().min(0, 'Reward cost must be non-negative').default(10),
});

export const createTaskSchema = z.discriminatedUnion('type', [
  createHabitSchema,
  createDailySchema,
  createTodoSchema,
  createRewardSchema,
]);

export const updateHabitSchema = createHabitSchema.omit({ type: true }).partial();
export const updateDailySchema = createDailySchema.omit({ type: true }).partial();
export const updateTodoSchema = createTodoSchema.omit({ type: true }).partial();
export const updateRewardSchema = createRewardSchema.omit({ type: true }).partial();

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type CreateHabitInput = z.infer<typeof createHabitSchema>;
export type CreateDailyInput = z.infer<typeof createDailySchema>;
export type CreateTodoInput = z.infer<typeof createTodoSchema>;
export type CreateRewardInput = z.infer<typeof createRewardSchema>;

export type UpdateHabitInput = z.infer<typeof updateHabitSchema>;
export type UpdateDailyInput = z.infer<typeof updateDailySchema>;
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;
export type UpdateRewardInput = z.infer<typeof updateRewardSchema>;
