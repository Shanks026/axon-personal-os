import { z } from 'zod'
import { CAPTURE_TYPES, MAX_CAPTURE } from '@/features/inbox/constants'

/** Quick capture: some text, and where it goes. */
export const captureSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Type something to capture')
    .max(MAX_CAPTURE, `Up to ${MAX_CAPTURE.toLocaleString()} characters`),
  type: z.enum(CAPTURE_TYPES.map((t) => t.value)),
})
