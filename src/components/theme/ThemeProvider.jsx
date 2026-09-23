import { ThemeProvider as NextThemesProvider } from 'next-themes'

export const THEME_STORAGE_KEY = 'axon-theme'

/** System, light or dark theme, set as a class on <html>. index.html applies it before first paint. */
export function ThemeProvider({ children }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey={THEME_STORAGE_KEY}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
