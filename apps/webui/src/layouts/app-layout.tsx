import clsx from 'clsx'
import { Bot, BrainCircuit, MessageCircle, Moon, Sun, Wrench } from 'lucide-react'
import { Outlet, useLocation } from 'react-router'
import {
  WorkspaceLink,
  WorkspaceTabs,
  WorkspaceTabsProvider,
  type WorkspaceTabItem,
} from './workspace-tabs'
import { workspaceIconStrokeWidth } from './workspace-tabs/constants'
import { getActivePath } from './workspace-tabs/utils'
import { useThemeMode } from '../theme'
import styles from './styles.module.css'

const defaultTab = { path: '/chat', title: 'Chat' }

const mainMenuItems: WorkspaceTabItem[] = [
  { path: '/chat', title: 'Chat', icon: MessageCircle },
  { path: '/agents', title: 'Agents', icon: Bot },
  { path: '/models', title: 'Models', icon: BrainCircuit },
  { path: '/tools', title: 'Tools', icon: Wrench },
]

export function AppLayout() {
  const { themeMode, toggleTheme } = useThemeMode()
  const location = useLocation()
  const activePath = getActivePath(location)
  const secondaryMenuItems = [
    {
      label: 'Toggle theme',
      icon: themeMode === 'dark' ? Sun : Moon,
      onClick: toggleTheme,
    },
  ]

  return (
    <WorkspaceTabsProvider defaultTab={defaultTab} items={mainMenuItems}>
      <div className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.logoArea}>
            <img className={styles.logo} src="/logo.svg" alt="CrazyClaw" />
          </div>

          <nav className={styles.mainMenu} aria-label="Main navigation">
            {mainMenuItems.map(({ path, title, icon: Icon }) => (
              <WorkspaceLink
                aria-current={activePath === path ? 'page' : undefined}
                aria-label={title}
                className={clsx(
                  styles.menuButton,
                  activePath === path && styles.menuButtonActive,
                )}
                key={path}
                openMode="tab"
                tabTitle={title}
                title={title}
                to={path}
              >
                {Icon && (
                  <Icon
                    aria-hidden="true"
                    size={22}
                    strokeWidth={workspaceIconStrokeWidth}
                  />
                )}
              </WorkspaceLink>
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
                <Icon
                  aria-hidden="true"
                  size={22}
                  strokeWidth={workspaceIconStrokeWidth}
                />
              </button>
            ))}
          </div>
        </aside>

        <WorkspaceTabs />

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </WorkspaceTabsProvider>
  )
}
