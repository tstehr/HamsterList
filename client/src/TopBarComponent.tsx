import classNames from 'classnames'
import * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import styles from './TopBarComponent.module.css'
import ArrowDownUp from './icons/arrow-down-up.svg?react'
import ArrowUp from './icons/arrow-up.svg?react'
import Back from './icons/back.svg?react'
import Cross from './icons/cross.svg?react'
import { ConnectionState, UpdateListTitle } from './sync'

interface Props {
  back?: () => void
  responsive?: boolean
  children: React.ReactNode
}

export default function TopBarComponent(props: Props): JSX.Element {
  const className = classNames(styles.TopBarComponent, {
    [styles.responsive]: props.responsive == null ? true : props.responsive,
  })
  return (
    <header className={className}>
      <div className={styles.Content}>
        {props.back && (
          <button type="button" className={styles.Back} onClick={props.back} aria-label="Back to all lists">
            <Back />
          </button>
        )}
        {props.children}
      </div>
    </header>
  )
}

interface EditTitleProps {
  title: string
  updateListTitle: UpdateListTitle
}
export function EditTitleComponent(props: EditTitleProps): JSX.Element {
  const [hasFocus, setHasFocus] = useState<boolean>()
  const [inputValue, setInputValue] = useState(props.title)
  const inputEl = useRef<HTMLInputElement>(null)

  useEffect((): void => {
    if (hasFocus && inputEl.current != null) {
      inputEl.current.focus()
    }
  })

  if (hasFocus) {
    const handleBlur = (): void => {
      setHasFocus(false)
      props.updateListTitle(inputValue)
    }

    const handleChange = (e: React.SyntheticEvent<HTMLInputElement>): void => {
      setInputValue(e.currentTarget.value)
    }

    return (
      <input
        className={styles.EditTitleComponent}
        type="text"
        value={inputValue}
        onBlur={handleBlur}
        onChange={handleChange}
        ref={inputEl}
      />
    )
  } else {
    const handleFocus = (): void => {
      setHasFocus(true)
      setInputValue(props.title)
    }

    return (
      <h1 tabIndex={0} className={styles.EditTitleComponent} onFocus={handleFocus}>
        <span>{props.title}</span>
      </h1>
    )
  }
}

interface SyncStatusProps {
  connectionState: ConnectionState
  syncing: boolean
  lastSyncFailed: boolean
  dirty: boolean
  manualSync: () => void
}

const stateMapping: { [k in ConnectionState]: React.ReactElement } = {
  disconnected: <Cross role="image" aria-label="No Network Connection" />,
  polling: <ArrowUp role="image" aria-label="Degraded Connection" />,
  socket: <ArrowDownUp role="image" aria-label="Connected" />,
}

export function SyncStatusComponent(props: SyncStatusProps): JSX.Element {
  const [fakeSyncing, setFakeSyncing] = useState(false)
  const fakeSyncingTimeoutIDRef = useRef<number | undefined>(undefined)

  useEffect((): void => {
    if (props.syncing) {
      setFakeSyncing(true)
      if (fakeSyncingTimeoutIDRef.current) {
        clearTimeout(fakeSyncingTimeoutIDRef.current)
      }
      fakeSyncingTimeoutIDRef.current = window.setTimeout((): void => {
        setFakeSyncing(false)
      }, 2000)
    }
  }, [props.syncing])

  const showSyncing = props.syncing || fakeSyncing
  const showFailure = props.lastSyncFailed || props.connectionState === 'disconnected'
  const statusClasses = classNames(styles.SyncStatusComponent, {
    [styles.syncing]: showSyncing,
    [styles.failure]: showFailure,
    [styles.synced]: !showFailure && !props.dirty && !showSyncing,
  })

  return (
    <button
      type="button"
      className={statusClasses}
      onClick={(e) => {
        props.manualSync()
        e.preventDefault()
      }}
    >
      {stateMapping[props.connectionState]}
    </button>
  )
}
