import { XProvider } from '@ant-design/x'
import { App as AntApp, theme } from 'antd'
import { useEffect, useState } from 'react'
import { RouterProvider } from 'react-router'
import { router } from './routes'
import {
  ThemeModeContext,
  appThemes,
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
          ...appThemes[themeMode],
        }}
      >
        <div data-theme={themeMode}>
          <AntApp>
            <RouterProvider router={router} />
          </AntApp>
        </div>
      </XProvider>
    </ThemeModeContext.Provider>
  )
}

export default App
