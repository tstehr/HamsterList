// @flow
import * as React from 'react'
import { Component, useState, useEffect, useRef } from 'react'
import classNames from 'classnames'
import { type Up } from './HistoryTracker'
import { type ConnectionState, type UpdateListTitle } from './ShoppingListContainerComponent'
import './TopBarComponent.css'

type Props = {
  up?: Up,
  responsive?: boolean,
  children: React.Node
}

const variantSelector15 = String.fromCharCode(0xfe0e)

export default function TopBarComponent(props: Props) {
  const className = classNames("TopBarComponent", {
    'TopBarComponent--responsive': props.responsive == null ? true : props.responsive,
  })

  return <header className={className}>
    <div className="TopBarComponent__content">
      {props.up && <button type="button" className="TopBarComponent__back" onClick={() => props.up('home')} aria-label="Back to all lists">
        {`◀${variantSelector15}`}
      </button>}
      {props.children}
    </div>
  </header>
}


type EditTitleProps = {
  title: string,
  updateListTitle: UpdateListTitle,
}

export function EditTitleComponent(props: EditTitleProps) {
  const [hasFocus, setHasFocus] = useState()
  const [inputValue, setInputValue] = useState()
  const inputEl = useRef(null)

  useEffect(() => {
    if (hasFocus && inputEl.current != null) {
      inputEl.current.focus()
    }
  })

  if (hasFocus) {
    const handleBlur = () => {
      setHasFocus(false)
      props.updateListTitle(inputValue)
    }

    const handleChange =  (e: SyntheticInputEvent<>) => { 
      setInputValue(e.target.value) 
    }

    return <input className="EditTitleComponent" type="text"
      value={inputValue}
      onBlur={handleBlur} onChange={handleChange}
      ref={inputEl}
    />
  } else {
    const handleFocus = () => {
      setHasFocus(true)
      setInputValue(props.title)
    }

    return <h1 tabIndex="0" className="EditTitleComponent"  onFocus={handleFocus}><span>{props.title}</span></h1>
  }
}


type SyncStatusProps = {
  connectionState: ConnectionState,
  syncing: boolean,
  lastSyncFailed: boolean,
  dirty: boolean,
  manualSync: () => void,
}

const stateMapping: {[ConnectionState]: string} = {
  "disconnected": "✖",
  "polling": `⬆${variantSelector15}`,
  "socket": `⬆${variantSelector15}⬇${variantSelector15}`
}

export function SyncStatusComponent(props: SyncStatusProps) {
  const [fakeSyncing, setFakeSyncing] = useState(false)
  const [fakeSyncingTimeoutId, setFakeSyncingTimeoutId] = useState(0)

  useEffect(() => {
    if (props.syncing) {
      setFakeSyncing(true)
      clearTimeout(fakeSyncingTimeoutId)
      const timeoutId = setTimeout(() => {
        setFakeSyncing(false)
      }, 2000)
      setFakeSyncingTimeoutId(timeoutId)
    }
  }, [props.syncing])

  const showSyncing = props.syncing || fakeSyncing
  const showFailure = props.lastSyncFailed || props.connectionState === 'disconnected'
  const statusClasses = classNames("SyncStatusComponent", {
    'SyncStatusComponent--syncing': showSyncing,
    'SyncStatusComponent--failure': showFailure,
    'SyncStatusComponent--synced': !showFailure && !props.dirty && !showSyncing
  })

  return <button type="button" className={statusClasses} onClick={(e) => { props.manualSync(); e.preventDefault()}}>
    <span>{stateMapping[props.connectionState]}</span>
  </button>
}
