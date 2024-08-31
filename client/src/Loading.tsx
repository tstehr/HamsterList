import React from 'react'

import Logo from './icons/logo.svg?react'
import styles from './Loading.module.css'

export default function Loading() {
  return (
    <div className={styles.Loading}>
      <Logo className={styles.Logo} />
    </div>
  )
}
