// @flow
import React, { Component } from 'react'
import { Switch, Route } from 'react-router-dom'

import ShoppingListContainerComponent from './ShoppingListContainerComponent'

type State = {
  offline: boolean
}

function ShoppingListContainerWrapperComponent(props) {
  return <ShoppingListContainerComponent listid={props.match.params.listid} />
}

export default class App extends Component<void, State> {
  constructor(props: void) {
    super(props)

    this.state = {
      offline: !window.navigator.onLine
    }
  }

  componentDidMount() {
    window.addEventListener('offline', this.handleOffline)
    window.addEventListener('online', this.handleOnline)
  }

  componentWillUnmount() {
    window.removeEventListener('offline', this.handleOffline)
    window.removeEventListener('online', this.handleOnline)
  }

  handleOffline = () => {
    this.setState({
      offline: true
    })
  }

  handleOnline = () => {
    this.setState({
      offline: false
    })
  }


  render() {
    return (
      <Switch>
        <Route exact path='/' component={undefined}/>
        <Route path='/:listid' exact component={ShoppingListContainerWrapperComponent}/>
      </Switch>
    )
  }
}
