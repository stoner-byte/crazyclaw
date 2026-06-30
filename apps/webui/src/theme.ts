import type { ThemeConfig } from 'antd'
import { createContext, useContext } from 'react'

export type ThemeMode = 'light' | 'dark'

export const themeStorageKey = 'crazyclaw-theme'

export const ThemeModeContext = createContext<{
  themeMode: ThemeMode
  toggleTheme: () => void
} | null>(null)

export const appThemes = {
  light: {
    token: {
      colorPrimary: '#0969da',
      colorInfo: '#0969da',
      colorLink: '#0969da',
      colorSuccess: '#1f883d',
      colorWarning: '#bf8700',
      colorError: '#cf222e',
      colorBgBase: '#ffffff',
      colorTextBase: '#1f2328',
      borderRadius: 8,
    },
    components: {
      Button: {
        primaryShadow: 'none',
        defaultShadow: 'none',
        defaultBg: '#f6f8fa',
        defaultHoverBg: '#f3f4f6',
        defaultBorderColor: 'rgba(27,31,36,0.15)',
        defaultColor: '#24292f',
      },
      Input: {
        activeBorderColor: '#0969da',
        hoverBorderColor: '#0969da',
      },
      Menu: {
        itemActiveBg: '#ddf4ff',
        itemBorderRadius: 8,
        itemHoverBg: 'rgba(234,238,242,0.5)',
        itemHoverColor: '#1f2328',
        itemSelectedBg: '#ddf4ff',
        itemSelectedColor: '#0969da',
      },
    },
  },
  dark: {
    token: {
      colorPrimary: '#2f81f7',
      colorInfo: '#2f81f7',
      colorLink: '#2f81f7',
      colorSuccess: '#238636',
      colorWarning: '#9e6a03',
      colorError: '#da3633',
      colorBgBase: '#0d1117',
      colorTextBase: '#e6edf3',
      borderRadius: 8,
    },
    components: {
      Button: {
        primaryShadow: 'none',
        defaultShadow: 'none',
        defaultBg: '#21262d',
        defaultHoverBg: '#30363d',
        defaultBorderColor: 'rgba(240,246,252,0.1)',
        defaultColor: '#c9d1d9',
      },
      Input: {
        activeBorderColor: '#2f81f7',
        hoverBorderColor: '#2f81f7',
      },
      Menu: {
        itemActiveBg: 'rgba(56,139,253,0.15)',
        itemBorderRadius: 8,
        itemHoverBg: '#21262d',
        itemHoverColor: '#e6edf3',
        itemSelectedBg: 'rgba(56,139,253,0.15)',
        itemSelectedColor: '#2f81f7',
      },
    },
  },
} satisfies Record<ThemeMode, Pick<ThemeConfig, 'components' | 'token'>>

export function useThemeMode() {
  const context = useContext(ThemeModeContext)
  if (!context) {
    throw new Error('useThemeMode must be used within ThemeModeContext')
  }
  return context
}
