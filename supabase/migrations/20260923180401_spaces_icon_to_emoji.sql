-- Spaces use an emoji instead of a lucide icon key (user decision 2026-09-23).
-- `icon` now stores the emoji itself; existing lucide keys map to the closest emoji.

update public.spaces set icon = case icon
  when 'briefcase' then '💼'      when 'leaf' then '🌿'         when 'rocket' then '🚀'
  when 'book-open' then '📖'      when 'graduation-cap' then '🎓' when 'heart' then '❤️'
  when 'dumbbell' then '🏋️'       when 'code' then '💻'         when 'palette' then '🎨'
  when 'music' then '🎵'          when 'plane' then '✈️'        when 'house' then '🏠'
  when 'camera' then '📷'         when 'coffee' then '☕'        when 'globe' then '🌍'
  when 'flask-conical' then '🧪'  when 'sprout' then '🌱'       when 'wallet' then '👛'
  when 'folder' then '📁'         when 'book' then '📚'         when 'building-2' then '🏢'
  when 'chart-line' then '📈'     when 'compass' then '🧭'      when 'gamepad-2' then '🎮'
  when 'hammer' then '🔨'         when 'landmark' then '🏛️'     when 'lightbulb' then '💡'
  when 'pen-tool' then '✒️'       when 'shopping-bag' then '🛍️' when 'sparkles' then '✨'
  when 'star' then '⭐'           when 'target' then '🎯'       when 'users' then '👥'
  when 'wrench' then '🔧'         when 'zap' then '⚡'
  else '📁' end;

alter table public.spaces alter column icon set default '📁';
alter table public.spaces
  add constraint spaces_icon_emoji_chk check (char_length(icon) between 1 and 16);
