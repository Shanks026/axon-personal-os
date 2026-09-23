import { HUE_KEYS } from '@/lib/tint'
import { SPACE_ICONS } from '@/components/shared/spaceIconMap'

/** Colour keys a space can use (tokens in index.css → --hue-<key>). */
export const SPACE_COLORS = HUE_KEYS

/** Icon keys offered in the picker, in display order. */
export const SPACE_ICON_KEYS = Object.keys(SPACE_ICONS)

export const DEFAULT_SPACE_ICON = 'folder'
export const DEFAULT_SPACE_COLOR = 'blue'
