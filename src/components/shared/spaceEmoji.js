/** Emoji shown for the Global view (it isn't a real space, so it has no stored icon). */
export const GLOBAL_EMOJI = '🌐'

/** Used when a space has no emoji (or an invalid one). */
export const DEFAULT_SPACE_EMOJI = '📁'

/**
 * Curated picker set: [emoji, search keywords]. Anything else can be pasted into the picker's
 * search box, since spaces.icon stores the emoji itself.
 */
export const SPACE_EMOJIS = [
  ['💼', 'work briefcase job office'],
  ['🏢', 'office company building corporate'],
  ['💻', 'code laptop dev computer frontend'],
  ['🧑‍💻', 'developer coder programmer'],
  ['🚀', 'rocket launch startup side project'],
  ['🛠️', 'tools build maintenance'],
  ['🔧', 'wrench fix repair'],
  ['⚙️', 'settings gear system'],
  ['📈', 'chart growth metrics finance'],
  ['📊', 'stats analytics report dashboard'],
  ['🎯', 'target goals focus okr'],
  ['🧭', 'compass direction planning strategy'],
  ['💡', 'idea lightbulb innovation'],
  ['🧪', 'lab experiment test research'],
  ['🔬', 'science research microscope'],
  ['📚', 'books study reading learning'],
  ['📖', 'book reading notes'],
  ['🎓', 'education graduation course learning'],
  ['✍️', 'writing journal blog'],
  ['📝', 'notes memo docs'],
  ['🗂️', 'files organise archive'],
  ['📁', 'folder files general'],
  ['📦', 'package product delivery shipping'],
  ['🛒', 'shopping cart store marketplace ecommerce'],
  ['🛍️', 'shopping bags retail'],
  ['🏪', 'store shop market'],
  ['💰', 'money finance budget savings'],
  ['👛', 'wallet money personal finance'],
  ['🧾', 'receipt bills expenses tax'],
  ['🏦', 'bank finance'],
  ['🏠', 'home house personal family'],
  ['🏡', 'home garden house'],
  ['👨‍👩‍👧', 'family kids home'],
  ['❤️', 'love heart relationship health'],
  ['🌿', 'leaf nature personal life calm'],
  ['🌱', 'sprout growth habits new'],
  ['🌸', 'flower spring self care'],
  ['🌍', 'world globe travel'],
  ['✈️', 'travel plane trip vacation'],
  ['🏖️', 'beach holiday vacation'],
  ['🏕️', 'camping outdoors trip'],
  ['🏋️', 'gym workout fitness health'],
  ['🏃', 'running exercise fitness'],
  ['🧘', 'meditation yoga mindfulness'],
  ['🍎', 'food nutrition diet health'],
  ['🍳', 'cooking recipes kitchen'],
  ['☕', 'coffee break cafe'],
  ['🎨', 'art design creative paint'],
  ['✏️', 'draw sketch pencil design'],
  ['📷', 'camera photo photography'],
  ['🎬', 'film video movie'],
  ['🎵', 'music song audio'],
  ['🎮', 'games gaming play'],
  ['⚽', 'football sports soccer'],
  ['🐶', 'dog pet'],
  ['🐱', 'cat pet'],
  ['🤝', 'meetings clients partners deals'],
  ['👥', 'team people community'],
  ['📣', 'marketing announcement campaign'],
  ['📅', 'calendar events schedule'],
  ['⏰', 'time reminder deadline'],
  ['✅', 'tasks done checklist'],
  ['📌', 'pin important priority'],
  ['🔥', 'fire hot urgent'],
  ['⚡', 'energy fast quick'],
  ['✨', 'sparkle new special'],
  ['⭐', 'star favourite'],
  ['💎', 'gem premium value'],
  ['🧠', 'brain mind second brain knowledge'],
  ['🔒', 'private secure lock'],
  ['🌐', 'web internet online'],
  ['🏛️', 'government institution admin'],
  ['⚖️', 'legal law justice'],
  ['🩺', 'medical doctor health'],
  ['🌙', 'night moon sleep'],
  ['☀️', 'sun day summer'],
]

const EMOJI_RE = /\p{Extended_Pictographic}/u

/** True when the string contains an emoji (used to accept pasted, non-curated emoji). */
export function looksLikeEmoji(text) {
  return EMOJI_RE.test(text ?? '')
}
