import { createContext, useContext } from 'react'

export type ThemeMode = 'light' | 'dark'

export const themeStorageKey = 'crazyclaw-theme'

export const ThemeModeContext = createContext<{
  themeMode: ThemeMode
  toggleTheme: () => void
} | null>(null)

export function useThemeMode() {
  const context = useContext(ThemeModeContext)
  if (!context) {
    throw new Error('useThemeMode must be used within ThemeModeContext')
  }
  return context
}
