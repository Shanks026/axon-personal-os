import { z } from 'zod'
import { GLOBAL_SLUG } from '@/lib/paths'
import { SPACE_COLORS, SPACE_ICON_KEYS } from '@/features/spaces/constants'
import { SLUG_MAX, SLUG_PATTERN } from '@/features/spaces/utils'

export const spaceSchema = z.object({
  name: z.string().trim().min(1, 'Give the space a name').max(60, 'Up to 60 characters'),
  slug: z
    .string()
    .trim()
    .min(1, 'Add a URL name')
    .max(SLUG_MAX, `Up to ${SLUG_MAX} characters`)
    .regex(SLUG_PATTERN, 'Lowercase letters, numbers and single dashes only')
    .refine((s) => s !== GLOBAL_SLUG, '“global” is reserved'),
  description: z.string().trim().max(280, 'Up to 280 characters'),
  color: z.enum(SPACE_COLORS),
  icon: z.enum(SPACE_ICON_KEYS),
})
