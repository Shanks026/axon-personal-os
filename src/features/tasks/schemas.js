import { z } from 'zod'
import { MAX_VERSIONS, versionSchema } from '@/lib/versions'
import { TASK_PRIORITIES, TASK_STATUSES } from '@/features/tasks/constants'

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()

/** A single task link's URL (used when adding a link, one at a time). */
export const taskLinkUrlSchema = z
  .string()
  .trim()
  .pipe(z.url('Enter a full link, e.g. https://gitlab.com/…'))

/** One free-text version a task is linked to (shared with notes: `lib/versions.js`). */
export const taskVersionSchema = versionSchema

export const taskSchema = z
  .object({
    space_id: z.uuid('Pick a space'),
    title: z.string().trim().min(1, 'Give the task a title').max(300, 'Up to 300 characters'),
    description_text: z.string().max(20_000),
    status: z.enum(TASK_STATUSES.map((s) => s.value)),
    priority: z.enum(TASK_PRIORITIES.map((p) => p.value)),
    start_date: isoDate,
    due_date: isoDate,
    versions: z.array(taskVersionSchema).max(MAX_VERSIONS, `Up to ${MAX_VERSIONS} versions`),
  })
  .refine((v) => !v.start_date || !v.due_date || v.start_date <= v.due_date, {
    path: ['due_date'],
    message: 'Due date is before the start date',
  })
