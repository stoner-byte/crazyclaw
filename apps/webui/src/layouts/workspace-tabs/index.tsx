import clsx from 'clsx'
import { X, type LucideIcon } from 'lucide-react'
import type { ComponentProps, MouseEvent, ReactNode } from 'react'
import { createContext, useContext, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { workspaceIconStrokeWidth, workspaceTabsStorageKey } from './constants'
import { getActivePath } from './utils'
import styles from './styles.module.css'

export type WorkspaceTab = {
  path: string
  title: string
}

export type WorkspaceTabItem = WorkspaceTab & {
  icon?: LucideIcon
}

type WorkspaceTabsContextValue = {
  closeTab: (path: string) => void
  items: WorkspaceTabItem[]
  openTab: (tab: WorkspaceTab) => void
  tabs: WorkspaceTab[]
}

type WorkspaceTabsProviderProps = {
  children: ReactNode
  defaultTab: WorkspaceTab
  items: WorkspaceTabItem[]
}

type WorkspaceLinkProps = Omit<ComponentProps<typeof Link>, 'to'> & {
  openMode?: 'route' | 'tab'
  tabTitle?: string
  to: string
}

const WorkspaceTabsContext = createContext<WorkspaceTabsContextValue | null>(
  null,
)

function getTabItem(items: WorkspaceTabItem[], path: string) {
  return items.find((item) => item.path === path)
}

function readStoredTabs(defaultTab: WorkspaceTab) {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(workspaceTabsStorageKey) ?? 'null',
    )

    if (!Array.isArray(parsed)) {
      return [defaultTab]
    }

    const tabs = parsed.filter(
      (tab): tab is WorkspaceTab =>
        typeof tab?.path === 'string' && typeof tab?.title === 'string',
    )

    return tabs.length > 0 ? tabs : [defaultTab]
  } catch {
    return [defaultTab]
  }
}

function shouldHandleClick(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.shiftKey
  )
}

function useWorkspaceTabs() {
  const context = useContext(WorkspaceTabsContext)

  if (!context) {
    throw new Error('Workspace tabs must be used inside WorkspaceTabsProvider')
  }

  return context
}

export function WorkspaceTabsProvider({
  children,
  defaultTab,
  items,
}: WorkspaceTabsProviderProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const activePath = getActivePath(location)
  const [tabs, setTabs] = useState<WorkspaceTab[]>(() =>
    readStoredTabs(defaultTab),
  )

  const openTab = (tab: WorkspaceTab) => {
    setTabs((currentTabs) => {
      const existingTab = currentTabs.find(
        (currentTab) => currentTab.path === tab.path,
      )

      if (!existingTab) {
        return [...currentTabs, tab]
      }

      if (existingTab.title === tab.title) {
        return currentTabs
      }

      return currentTabs.map((currentTab) =>
        currentTab.path === tab.path
          ? { ...currentTab, title: tab.title }
          : currentTab,
      )
    })
  }

  const closeTab = (path: string) => {
    const tabIndex = tabs.findIndex((tab) => tab.path === path)

    if (tabIndex < 0) {
      return
    }

    const nextTabs = tabs.filter((tab) => tab.path !== path)

    if (nextTabs.length === 0) {
      setTabs([defaultTab])
      navigate(defaultTab.path)
      return
    }

    setTabs(nextTabs)

    if (path === activePath) {
      navigate((nextTabs[tabIndex] ?? nextTabs[tabIndex - 1]).path)
    }
  }

  useEffect(() => {
    const item = getTabItem(items, activePath)

    if (item) {
      openTab({ path: item.path, title: item.title })
    }
  }, [activePath, items])

  useEffect(() => {
    localStorage.setItem(workspaceTabsStorageKey, JSON.stringify(tabs))
  }, [tabs])

  return (
    <WorkspaceTabsContext.Provider value={{ closeTab, items, openTab, tabs }}>
      {children}
    </WorkspaceTabsContext.Provider>
  )
}

export function WorkspaceLink({
  children,
  onClick,
  openMode = 'route',
  tabTitle,
  to,
  ...props
}: WorkspaceLinkProps) {
  const navigate = useNavigate()
  const workspaceTabs = useContext(WorkspaceTabsContext)

  if (openMode !== 'tab') {
    return (
      <Link onClick={onClick} to={to} {...props}>
        {children}
      </Link>
    )
  }

  return (
    <Link
      onClick={(event) => {
        onClick?.(event)

        if (event.defaultPrevented || !shouldHandleClick(event)) {
          return
        }

        if (!workspaceTabs) {
          throw new Error(
            'WorkspaceLink with openMode="tab" must be used inside WorkspaceTabsProvider',
          )
        }

        event.preventDefault()
        workspaceTabs.openTab({ path: to, title: tabTitle ?? to })
        navigate(to)
      }}
      to={to}
      {...props}
    >
      {children}
    </Link>
  )
}

export function WorkspaceTabs() {
  const { closeTab, items, tabs } = useWorkspaceTabs()
  const location = useLocation()
  const activePath = getActivePath(location)

  return (
    <div className={styles.tabbar} role="tablist" aria-label="Workspace tabs">
      {tabs.map(({ path, title }) => {
        const item = getTabItem(items, path)
        const Icon = item?.icon
        const isActive = activePath === path

        return (
          <div
            className={clsx(styles.tabItem, isActive && styles.tabItemActive)}
            key={path}
            role="presentation"
          >
            <WorkspaceLink
              aria-selected={isActive}
              className={styles.tabLink}
              openMode="tab"
              role="tab"
              tabTitle={title}
              title={title}
              to={path}
            >
              {Icon && (
                <Icon
                  aria-hidden="true"
                  size={16}
                  strokeWidth={workspaceIconStrokeWidth}
                />
              )}
              <span>{title}</span>
            </WorkspaceLink>
            <button
              aria-label={`Close ${title}`}
              className={styles.tabClose}
              onClick={() => closeTab(path)}
              title={`Close ${title}`}
              type="button"
            >
              <X aria-hidden="true" size={14} strokeWidth={2} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
