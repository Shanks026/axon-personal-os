import { z } from 'zod'
import { TASK_PRIORITIES, TASK_STATUSES } from '@/features/tasks/constants'

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()

const url = z
  .string()
  .trim()
  .transform((v) => v || null)
  .pipe(z.url('Enter a full link, e.g. https://gitlab.com/…').nullable())

export const taskSchema = z
  .object({
    space_id: z.uuid('Pick a space'),
    title: z.string().trim().min(1, 'Give the task a title').max(300, 'Up to 300 characters'),
    description_text: z.string().max(20_000),
    status: z.enum(TASK_STATUSES.map((s) => s.value)),
    priority: z.enum(TASK_PRIORITIES.map((p) => p.value)),
    start_date: isoDate,
    due_date: isoDate,
    external_url: url,
  })
  .refine((v) => !v.start_date || !v.due_date || v.start_date <= v.due_date, {
    path: ['due_date'],
    message: 'Due date is before the start date',
  })
