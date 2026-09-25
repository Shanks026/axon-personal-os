import { cn } from '@/lib/utils'

/**
 * The right-hand details rail on the task and note detail pages (from `lg` up; below that the
 * pages use a Sheet). It opens and closes like the sidebar: the width animates over 200ms
 * (`ease-linear`, the sidebar's own timing) while the contents stay laid out at full width, so
 * nothing reflows mid-animation; they fade with it. Closed, it's inert (no focus, no screen
 * reader). `overflow-x-clip`, not `hidden`, so the sticky contents keep sticking to the page.
 */
export function DetailRail({ open, children }) {
  return (
    <aside
      aria-hidden={!open}
      inert={!open}
      className={cn(
        'hidden shrink-0 overflow-x-clip border-l transition-[width,border-color] duration-200 ease-linear motion-reduce:transition-none lg:block',
        open ? 'w-76' : 'w-0 border-transparent',
      )}
    >
      <div
        className={cn(
          'sticky top-0 w-76 p-5 transition-opacity duration-200 ease-linear motion-reduce:transition-none',
          open ? 'opacity-100' : 'opacity-0',
        )}
      >
        {children}
      </div>
    </aside>
  )
}
