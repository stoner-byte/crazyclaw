import { Navigate, createBrowserRouter } from 'react-router'
import { EmptyHydrateFallback } from './hydrate-fallback'

export const router = createBrowserRouter([
  {
    path: '/',
    HydrateFallback: EmptyHydrateFallback,
    lazy: async () => {
      const { AppLayout } = await import('../layouts/app-layout')
      return { Component: AppLayout }
    },
    children: [
      {
        index: true,
        element: <Navigate to="/chat" replace />,
      },
      {
        path: 'chat',
        lazy: async () => {
          const { ChatPage } = await import('../pages/chat')
          return { Component: ChatPage }
        },
      },
      {
        path: 'agents',
        lazy: async () => {
          const { AgentsPage } = await import('../pages/agents')
          return { Component: AgentsPage }
        },
      },
      {
        path: 'models',
        lazy: async () => {
          const { ModelsPage } = await import('../pages/models')
          return { Component: ModelsPage }
        },
      },
      {
        path: 'tools',
        lazy: async () => {
          const { ToolsPage } = await import('../pages/tools')
          return { Component: ToolsPage }
        },
      },
    ],
  },
])
