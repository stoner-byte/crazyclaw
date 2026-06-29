import { Button, Result } from 'antd'

export function HomePage() {
  return (
    <main className="app-shell">
      <Result
        status="info"
        title="CrazyClaw"
        subTitle="UI shell is ready for the workspace redesign."
        extra={<Button type="primary">New chat</Button>}
      />
    </main>
  )
}
