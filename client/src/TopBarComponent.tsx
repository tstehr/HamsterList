import classNames from 'classnames'
import * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import { Up } from './HistoryTracker'
import { ConnectionState, UpdateListTitle } from './ShoppingListContainerComponent'
import './TopBarComponent.css'

type Props = {
  up?: Up
  responsive?: boolean
  children: React.ReactNode
}

const variantSelector15 = String.fromCharCode(0xfe0e)
export default function TopBarComponent(props: Props): JSX.Element {
  const className = classNames('TopBarComponent', {
    'TopBarComponent--responsive': props.responsive == null ? true : props.responsive,
  })
  return (
    <header className={className}>
      <div className="TopBarComponent__content">
        {props.up && (
          <button
            type="button"
            className="TopBarComponent__back"
            onClick={() => props.up && props.up('home')}
            aria-label="Back to all lists"
          >
            {`◀${variantSelector15}`}
          </button>
        )}
        {props.children}
      </div>
    </header>
  )
}

type EditTitleProps = {
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
        className="EditTitleComponent"
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
      <h1 tabIndex={0} className="EditTitleComponent" onFocus={handleFocus}>
        <span>{props.title}</span>
      </h1>
    )
  }
}

type SyncStatusProps = {
  connectionState: ConnectionState
  syncing: boolean
  lastSyncFailed: boolean
  dirty: boolean
  manualSync: () => void
}

const stateMapping: { [k in ConnectionState]: string } = {
  disconnected: '✖',
  polling: `⬆${variantSelector15}`,
  socket: `⬆${variantSelector15}⬇${variantSelector15}`,
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
  const statusClasses = classNames('SyncStatusComponent', {
    'SyncStatusComponent--syncing': showSyncing,
    'SyncStatusComponent--failure': showFailure,
    'SyncStatusComponent--synced': !showFailure && !props.dirty && !showSyncing,
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
      <span>{stateMapping[props.connectionState]}</span>
    </button>
  )
}
