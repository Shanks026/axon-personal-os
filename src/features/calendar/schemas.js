import { z } from 'zod'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick a date')
const time = z.string().regex(/^\d{2}:\d{2}$/, 'Pick a time')

/**
 * The event dialog's form. Times are local 'HH:mm' in the profile time zone; they're ignored for
 * all-day events. `toEventTimestamps` turns the result into `starts_at` / `ends_at`.
 */
export const eventSchema = z
  .object({
    space_id: z.uuid('Pick a space'),
    title: z.string().trim().min(1, 'Give the event a title').max(200, 'Up to 200 characters'),
    all_day: z.boolean(),
    start_date: isoDate,
    end_date: isoDate,
    start_time: time,
    end_time: time,
    location: z.string().trim().max(200, 'Up to 200 characters'),
    url: z.union([
      z.literal(''),
      z.string().trim().pipe(z.url('Enter a full link, e.g. https://meet.google.com/…')),
    ]),
    description: z.string().max(5000, 'Up to 5000 characters'),
    task_id: z.uuid().nullable(),
  })
  .refine(
    (v) =>
      v.all_day
        ? v.end_date >= v.start_date
        : `${v.end_date}T${v.end_time}` >= `${v.start_date}T${v.start_time}`,
    { path: ['end_date'], message: 'The event ends before it starts' },
  )
