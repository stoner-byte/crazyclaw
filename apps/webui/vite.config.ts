import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'vendor-react',
              test: /[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/,
            },
            {
              name: 'vendor-antd',
              test: /[\\/]node_modules[\\/](antd|@ant-design|@rc-component|rc-.*)[\\/]/,
            },
          ],
        },
      },
    },
  },
  plugins: [react()],
})
