// @flow
import React, { Component } from 'react'
import { type ConnectionState, type ManualSync, type UpdateListTitle } from './ShoppingListContainerComponent'
import './TopBarComponent.css'

type Props = {
  title: string,
  connectionState: ConnectionState,
  syncing: boolean,
  lastSyncFailed: boolean,
  dirty: boolean,
  manualSync: ManualSync,
  updateListTitle: UpdateListTitle,
}

type State = {
  hasFocus: boolean,
  inputValue: string
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

  render() {
    const classes = ["TopBarComponent"]
    if (this.props.dirty) {
      classes.push("TopBarComponent--dirty")
    }
    const className = classes.join(" ")

    return (
      <div className={className}>
        <div className="TopBarComponent__content">
          <span>{this.props.connectionState}<br />{this.props.lastSyncFailed ? "fail" : "works"}</span>
          {
            this.state.hasFocus
              ? <input type="text"
                  value={this.state.inputValue}
                  onBlur={this.handleBlur} onChange={this.handleChange}
                  ref={(input) => this.input = input}
                />
              : <h1 tabIndex="0" onFocus={this.handleFocus}>{this.props.title}</h1>
          }
          <button onClick={this.props.manualSync}>{this.props.syncing ? "Syncing" : "Sync"}</button>
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
