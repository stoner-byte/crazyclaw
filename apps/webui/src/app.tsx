import { XProvider } from '@ant-design/x'
import { App as AntApp, theme } from 'antd'
import { useEffect, useState } from 'react'
import { RouterProvider } from 'react-router'
import { router } from './routes'
import {
  ThemeModeContext,
  type ThemeMode,
  themeStorageKey,
} from './theme'

function readStoredTheme(): ThemeMode {
  return localStorage.getItem(themeStorageKey) === 'dark' ? 'dark' : 'light'
}

function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(readStoredTheme)
  const toggleTheme = () => {
    setThemeMode((current) => (current === 'dark' ? 'light' : 'dark'))
  }

  useEffect(() => {
    localStorage.setItem(themeStorageKey, themeMode)
  }, [themeMode])

  return (
    <ThemeModeContext.Provider value={{ themeMode, toggleTheme }}>
      <XProvider
        theme={{
          algorithm:
            themeMode === 'dark'
              ? theme.darkAlgorithm
              : theme.defaultAlgorithm,
          token: {
            borderRadius: 8,
            colorPrimary: '#1677ff',
          },
        }}
      >
        <AntApp>
          <RouterProvider router={router} />
        </AntApp>
      </XProvider>
    </ThemeModeContext.Provider>
  )
}

export default App
