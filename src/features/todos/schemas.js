import { z } from 'zod'

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()

export const todoTitleSchema = z.string().trim().min(1).max(500)

export const todoSchema = z.object({
  space_id: z.uuid('Pick a space'),
  title: z.string().trim().min(1, 'Give the todo a title').max(500, 'Up to 500 characters'),
  due_date: isoDate,
})
