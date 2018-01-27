// @flow
import React, { Component } from 'react'
import { type ConnectionState, type ManualSync } from './ShoppingListContainerComponent'
import './TopBarComponent.css'

type Props = {
  title: string,
  connectionState: ConnectionState,
  manualSync: ManualSync,
  syncing: boolean,
  lastSyncFailed: boolean,
  dirty: boolean,
}

export default function TopBarComponent(props: Props) {
  const classes = ["TopBarComponent"]
  if (props.dirty) {
    classes.push("TopBarComponent--dirty")
  }
  const className = classes.join(" ")

  return (
    <div className={className}>
      <div className="TopBarComponent__content">
        <span>{props.connectionState}<br />{props.lastSyncFailed ? "fail" : "works"}</span>
        <h1>{props.title}</h1>
        <button onClick={props.manualSync}>{props.syncing ? "Syncing" : "Sync"}</button>
      </div>
    </div>
  )
}
