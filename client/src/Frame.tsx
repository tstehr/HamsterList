import React, { ReactNode } from 'react'
import styles from './Frame.module.css'

interface Props {
  children?: {
    topBar?: ReactNode
    sections?: ReactNode[]
    footer?: ReactNode
  }
}

export default function Frame({ children }: Props) {
  return (
    <div className={styles.Frame}>
      {children?.topBar}
      <div className={styles.Body}>
        {children?.sections?.map((sec) => (
          <section className={styles.Section} role="main">
            {sec}
          </section>
        ))}
      </div>
      <footer className={styles.Footer}>{children?.footer}</footer>
    </div>
  )
}
