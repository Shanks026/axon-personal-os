import { useTheme as useNextTheme } from 'next-themes'

/** `{ theme: 'system' | 'light' | 'dark', resolvedTheme: 'light' | 'dark', setTheme }` */
export function useTheme() {
  const { theme, resolvedTheme, setTheme } = useNextTheme()
  return { theme: theme ?? 'system', resolvedTheme: resolvedTheme ?? 'light', setTheme }
}
