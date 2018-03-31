// @flow
import React, { Component } from 'react'
import { type Up } from './HistoryTracker'
import { type ConnectionState, type UpdateListTitle } from './ShoppingListContainerComponent'
import './TopBarComponent.css'

type Props = {
  title: string,
  connectionState: ConnectionState,
  syncing: boolean,
  lastSyncFailed: boolean,
  dirty: boolean,
  manualSync: () => void,
  updateListTitle: UpdateListTitle,
  up: Up,
}

type State = {
  hasFocus: boolean,
  inputValue: string,
  fakeSyncing: boolean
}

const variantSelector15 = String.fromCharCode(0xfe0e)

const stateMapping: {[ConnectionState]: string} = {
  "disconnected": "✖",
  "polling": `⬆${variantSelector15}`,
  "socket": `⬆${variantSelector15}⬇${variantSelector15}`
}

export default class TopBarComponent extends Component<Props, State> {
  input: ?HTMLInputElement
  stopSyncingTimeoutId: number

  constructor(props: Props) {
    super(props)
    this.state = {
      hasFocus: false,
      inputValue: "",
      fakeSyncing: false
    }
  }

  onStatusClick = (e: SyntheticEvent<>) => {
    this.props.manualSync()
    e.preventDefault()
  }

  componentWillReceiveProps(newProps: Props) {
    if (newProps.syncing) {
      this.setState({
        fakeSyncing: true
      })
      clearTimeout(this.stopSyncingTimeoutId)
      this.stopSyncingTimeoutId = setTimeout(() => {
        this.setState({fakeSyncing: false})
      }, 1500)
    }
  }

  render() {
    const classes = ["TopBarComponent"]
    if (this.props.dirty) {
      classes.push("TopBarComponent--dirty")
    }

    const showSyncing = this.props.syncing || this.state.fakeSyncing
    const statusClasses = ["TopBarComponent__status"]
    if (showSyncing) {
      statusClasses.push("TopBarComponent__status--syncing")
    }
    if (this.props.lastSyncFailed || this.props.connectionState === 'disconnected') {
      statusClasses.push("TopBarComponent__status--failure")
    } else if (!this.props.dirty && !showSyncing) {
      statusClasses.push("TopBarComponent__status--synced")
    }

    return (
      <div className={classes.join(" ")}>
        <div className="TopBarComponent__content">
          <button type="button" className="TopBarComponent__back" onClick={() => this.props.up('home')}>
            {`◀${variantSelector15}`}
          </button>
          {
            this.state.hasFocus
              ? <input type="text"
                  value={this.state.inputValue}
                  onBlur={this.handleBlur} onChange={this.handleChange}
                  ref={(input) => this.input = input}
                />
              : <h1 tabIndex="0" onFocus={this.handleFocus}><span>{this.props.title}</span></h1>
          }
          <button type="button" className={statusClasses.join(" ")} onClick={this.onStatusClick}>
            <span>{stateMapping[this.props.connectionState]}</span>
          </button>
        </div>
      </div>
    )
  }

  componentDidUpdate(){
    if (this.state.hasFocus && this.input != null) {
      this.input.focus()
    }
  }

  handleFocus = () => {
    this.setState({
      hasFocus: true,
      inputValue: this.props.title
    })
  }

  handleBlur = () => {
    this.props.updateListTitle(this.state.inputValue)
    this.setState({
      hasFocus: false,
      inputValue: ""
    })
  }

  handleChange = (e: SyntheticInputEvent<>) => { this.setState({inputValue: e.target.value}) }
}
