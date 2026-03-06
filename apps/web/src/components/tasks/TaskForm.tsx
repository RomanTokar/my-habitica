import { useEffect, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import type { Task, TaskType } from '@my-habitica/shared';
import { useCreateTask, useUpdateTask } from '@/hooks/use-tasks';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

// ── Local form schema ─────────────────────────────────────────────────────────

const checklistItemSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  completed: z.boolean(),
});

const formSchema = z.object({
  text: z.string().min(1, 'Task text is required').max(500),
  notes: z.string().max(5000).optional(),
  priority: z.enum(['0.1', '1', '1.5', '2']),
  // Habit
  up: z.boolean().optional(),
  down: z.boolean().optional(),
  habitFrequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
  // Daily
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
  everyX: z.coerce.number().int().min(1).optional(),
  repeat: z
    .object({
      m: z.boolean(),
      t: z.boolean(),
      w: z.boolean(),
      th: z.boolean(),
      f: z.boolean(),
      s: z.boolean(),
      su: z.boolean(),
    })
    .optional(),
  // Todo
  dueDate: z.string().optional(),
  // Reward
  value: z.coerce.number().min(0).optional(),
  // Shared checklist
  checklist: z.array(checklistItemSchema).optional(),
});

type FormValues = z.infer<typeof formSchema>;

// ── Props ─────────────────────────────────────────────────────────────────────

interface TaskFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: TaskType;
  task?: Task; // if provided, edit mode
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDefaultValues(task?: Task): FormValues {
  const base: FormValues = {
    text: task?.text ?? '',
    notes: task?.notes ?? '',
    priority: task?.priority ?? '1',
    // Habit defaults
    up: true,
    down: true,
    habitFrequency: 'weekly',
    // Daily defaults
    frequency: 'weekly',
    everyX: 1,
    repeat: { m: true, t: true, w: true, th: true, f: true, s: false, su: false },
    // Reward
    value: 10,
    // Checklist
    checklist: [],
  };

  if (!task) return base;

  if (task.type === 'habit') {
    return {
      ...base,
      up: task.up,
      down: task.down,
      habitFrequency: task.habitFrequency,
    };
  }

  if (task.type === 'daily') {
    return {
      ...base,
      frequency: task.frequency,
      everyX: task.everyX,
      repeat: task.repeat,
      checklist: task.checklist,
    };
  }

  if (task.type === 'todo') {
    return {
      ...base,
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      checklist: task.checklist,
    };
  }

  if (task.type === 'reward') {
    return {
      ...base,
      value: task.value,
    };
  }

  return base;
}

function buildPayload(type: TaskType, values: FormValues): Record<string, unknown> {
  const base = {
    type,
    text: values.text,
    notes: values.notes ?? '',
    priority: values.priority,
  };

  if (type === 'habit') {
    return {
      ...base,
      up: values.up ?? true,
      down: values.down ?? true,
      habitFrequency: values.habitFrequency ?? 'weekly',
    };
  }

  if (type === 'daily') {
    return {
      ...base,
      frequency: values.frequency ?? 'weekly',
      everyX: values.everyX ?? 1,
      repeat: values.repeat ?? { m: true, t: true, w: true, th: true, f: true, s: false, su: false },
      checklist: values.checklist ?? [],
    };
  }

  if (type === 'todo') {
    return {
      ...base,
      dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : null,
      checklist: values.checklist ?? [],
    };
  }

  if (type === 'reward') {
    return {
      ...base,
      value: values.value ?? 10,
    };
  }

  return base;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TaskForm({ open, onOpenChange, type, task }: TaskFormProps) {
  const isEdit = Boolean(task);
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: getDefaultValues(task),
  });

  const { fields: checklistFields, append, remove } = useFieldArray({
    control,
    name: 'checklist',
  });

  const [newChecklistItem, setNewChecklistItem] = useState('');
  const frequency = watch('frequency');

  // Reset form when dialog opens/closes or task changes
  useEffect(() => {
    if (open) {
      reset(getDefaultValues(task));
    }
  }, [open, task, type, reset]);

  const isPending = createTask.isPending || updateTask.isPending;

  const onSubmit = (values: FormValues) => {
    const payload = buildPayload(type, values);

    if (isEdit && task) {
      updateTask.mutate(
        { id: task.id, data: payload },
        { onSuccess: () => onOpenChange(false) }
      );
    } else {
      createTask.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  const addChecklistItem = () => {
    if (newChecklistItem.trim()) {
      append({ id: crypto.randomUUID(), text: newChecklistItem.trim(), completed: false });
      setNewChecklistItem('');
    }
  };

  const typeLabels: Record<TaskType, string> = {
    habit: 'Habit',
    daily: 'Daily',
    todo: 'To-Do',
    reward: 'Reward',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Edit ${typeLabels[type]}` : `Add ${typeLabels[type]}`}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 space-y-4 pb-2">
            {/* Server error */}
            {(createTask.isError || updateTask.isError) && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                Failed to save task. Please try again.
              </div>
            )}

            {/* Text */}
            <div className="space-y-1.5">
              <Label htmlFor="text">
                {type === 'reward' ? 'Reward Name' : 'Task Name'}
                <span className="text-red-500 ml-1">*</span>
              </Label>
              <Input
                id="text"
                placeholder={type === 'reward' ? 'e.g. Watch a movie' : 'e.g. Exercise for 30 minutes'}
                autoFocus
                {...register('text')}
              />
              {errors.text && (
                <p className="text-xs text-red-600">{errors.text.message}</p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Optional notes..."
                rows={2}
                {...register('notes')}
              />
            </div>

            {/* Priority (not for rewards) */}
            {type !== 'reward' && (
              <div className="space-y-1.5">
                <Label htmlFor="priority">Priority</Label>
                <Select id="priority" {...register('priority')}>
                  <option value="0.1">Trivial</option>
                  <option value="1">Easy</option>
                  <option value="1.5">Medium</option>
                  <option value="2">Hard</option>
                </Select>
              </div>
            )}

            <Separator />

            {/* ── Habit-specific ── */}
            {type === 'habit' && (
              <>
                <div className="space-y-2">
                  <Label>Directions</Label>
                  <div className="flex gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Controller
                        control={control}
                        name="up"
                        render={({ field }) => (
                          <Checkbox
                            checked={field.value ?? true}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                      <span className="text-sm">+ Positive</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Controller
                        control={control}
                        name="down"
                        render={({ field }) => (
                          <Checkbox
                            checked={field.value ?? true}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                      <span className="text-sm">- Negative</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="habitFrequency">Reset Counter</Label>
                  <Select id="habitFrequency" {...register('habitFrequency')}>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </Select>
                </div>
              </>
            )}

            {/* ── Daily-specific ── */}
            {type === 'daily' && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select id="frequency" {...register('frequency')}>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </Select>
                </div>

                {frequency === 'daily' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="everyX">Every X Days</Label>
                    <Input
                      id="everyX"
                      type="number"
                      min={1}
                      {...register('everyX', { valueAsNumber: true })}
                    />
                  </div>
                )}

                {frequency === 'weekly' && (
                  <div className="space-y-2">
                    <Label>Repeat on Days</Label>
                    <div className="flex flex-wrap gap-3">
                      {(
                        [
                          { key: 'm', label: 'M' },
                          { key: 't', label: 'T' },
                          { key: 'w', label: 'W' },
                          { key: 'th', label: 'Th' },
                          { key: 'f', label: 'F' },
                          { key: 's', label: 'Sa' },
                          { key: 'su', label: 'Su' },
                        ] as const
                      ).map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-1.5 cursor-pointer">
                          <Checkbox
                            checked={watch(`repeat.${key}`) ?? false}
                            onCheckedChange={(checked) =>
                              setValue(`repeat.${key}`, checked)
                            }
                          />
                          <span className="text-sm font-medium">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── Todo-specific ── */}
            {type === 'todo' && (
              <div className="space-y-1.5">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input id="dueDate" type="date" {...register('dueDate')} />
              </div>
            )}

            {/* ── Reward-specific ── */}
            {type === 'reward' && (
              <div className="space-y-1.5">
                <Label htmlFor="value">Gold Cost</Label>
                <Input
                  id="value"
                  type="number"
                  min={0}
                  step={0.1}
                  {...register('value', { valueAsNumber: true })}
                />
                {errors.value && (
                  <p className="text-xs text-red-600">{errors.value.message}</p>
                )}
              </div>
            )}

            {/* ── Checklist (daily + todo) ── */}
            {(type === 'daily' || type === 'todo') && (
              <div className="space-y-2">
                <Label>Checklist</Label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {checklistFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-2">
                      <Input
                        placeholder="Checklist item..."
                        {...register(`checklist.${index}.text`)}
                        className="h-8 text-sm"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => remove(index)}
                        className="text-gray-400 hover:text-red-500 shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add checklist item..."
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addChecklistItem();
                      }
                    }}
                    className="h-8 text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addChecklistItem}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : isEdit ? (
                'Save changes'
              ) : (
                'Add task'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
