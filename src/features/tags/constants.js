import { HUE_KEYS } from '@/lib/tint'

// The design system finalised one ten-key hue palette (design-system.md → Space accents), shared
// by spaces and tags. This was a placeholder ("TAG_COLORS") in the Phase 3 plan; by the time this
// phase was built, `HUE_KEYS` already existed, so tags reuse it directly instead of duplicating it.
export const TAG_COLORS = HUE_KEYS
