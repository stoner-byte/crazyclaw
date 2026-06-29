import { App as AntApp, ConfigProvider } from 'antd'
import { RouterProvider } from 'react-router'
import { router } from './routes'

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          borderRadius: 8,
          colorPrimary: '#1677ff',
        },
      }}
    >
      <AntApp>
        <RouterProvider router={router} />
      </AntApp>
    </ConfigProvider>
  )
}

export default App
