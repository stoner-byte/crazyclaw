import clsx from 'clsx'
import { Bot, BrainCircuit, MessageCircle, Moon, Sun, Wrench } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { useThemeMode } from '../theme'
import styles from './app-layout.module.css'

const menuIconStrokeWidth = 1.8

const mainMenuItems = [
  { path: '/chat', label: 'Chat', icon: MessageCircle },
  { path: '/agents', label: 'Agents', icon: Bot },
  { path: '/models', label: 'Models', icon: BrainCircuit },
  { path: '/tools', label: 'Tools', icon: Wrench },
]

export function AppLayout() {
  const { themeMode, toggleTheme } = useThemeMode()
  const secondaryMenuItems = [
    {
      label: 'Toggle theme',
      icon: themeMode === 'dark' ? Sun : Moon,
      onClick: toggleTheme,
    },
  ]

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.logoArea}>
          <img className={styles.logo} src="/logo.svg" alt="CrazyClaw" />
        </div>

        <nav className={styles.mainMenu} aria-label="Main navigation">
          {mainMenuItems.map(({ path, label, icon: Icon }) => (
            <NavLink
              aria-label={label}
              className={({ isActive }) =>
                clsx(styles.menuButton, isActive && styles.menuButtonActive)
              }
              key={path}
              title={label}
              to={path}
            >
              <Icon aria-hidden="true" size={22} strokeWidth={menuIconStrokeWidth} />
            </NavLink>
          ))}
        </nav>

        <div className={styles.secondaryMenu}>
          {secondaryMenuItems.map(({ label, icon: Icon, onClick }) => (
            <button
              aria-label={label}
              className={styles.menuButton}
              key={label}
              onClick={onClick}
              title={label}
              type="button"
            >
              <Icon aria-hidden="true" size={22} strokeWidth={menuIconStrokeWidth} />
            </button>
          ))}
        </div>
      </aside>

      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  )
}
