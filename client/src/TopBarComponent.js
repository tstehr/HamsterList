// @flow
import React, { Component } from 'react'
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
}

type State = {
  hasFocus: boolean,
  inputValue: string
}

const variantSelector15 = String.fromCharCode(0xfe0e)

const stateMapping: {[ConnectionState]: string} = {
  "disconnected": "✖",
  "polling": `⬆${variantSelector15}`,
  "socket": `⬆${variantSelector15}⬇${variantSelector15}`
}

export default class TopBarComponent extends Component<Props, State> {
  input: ?HTMLInputElement

  constructor(props: Props) {
    super(props)
    this.state = {
      hasFocus: false,
      inputValue: ""
    }
  }

  onStatusClick = (e: SyntheticEvent<>) => {
    this.props.manualSync()
    e.preventDefault()
  }

  render() {
    const classes = ["TopBarComponent"]
    if (this.props.dirty) {
      classes.push("TopBarComponent--dirty")
    }

    const statusClasses = ["TopBarComponent__status"]
    if (this.props.syncing) {
      statusClasses.push("TopBarComponent__status--syncing")
    }
    if (this.props.lastSyncFailed || this.props.connectionState == 'disconnected') {
      statusClasses.push("TopBarComponent__status--failure")
    } else if (!this.props.dirty) {
      statusClasses.push("TopBarComponent__status--synced")
    }

    return (
      <div className={classes.join(" ")}>
        <div className="TopBarComponent__content">
          {
            this.state.hasFocus
              ? <input type="text"
                  value={this.state.inputValue}
                  onBlur={this.handleBlur} onChange={this.handleChange}
                  ref={(input) => this.input = input}
                />
              : <h1 tabIndex="0" onFocus={this.handleFocus}><span>{this.props.title}</span></h1>
          }
          <button className={statusClasses.join(" ")} onClick={this.onStatusClick}>
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
