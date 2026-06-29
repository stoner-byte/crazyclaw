import styles from './empty-page.module.css'

type EmptyPageProps = {
  title: string
}

export function EmptyPage({ title }: EmptyPageProps) {
  return (
    <section className={styles.page}>
      <h1>{title}</h1>
    </section>
  )
}
