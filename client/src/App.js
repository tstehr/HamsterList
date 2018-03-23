// @flow
import React, { Component } from 'react'
import { BrowserRouter, Switch, Route } from 'react-router-dom'

import ChooseListComponent from './ChooseListComponent'
import ShoppingListComponent from './ShoppingListContainerComponent'
import ShoppingListContainerComponent from './ShoppingListContainerComponent'


function ShoppingListContainerWrapperComponent(props) {
  return <ShoppingListContainerComponent listid={props.match.params.listid} />
}

export default class App extends Component<void> {
  render() {
    return (
      <BrowserRouter>
        <Switch>
          <Route exact path='/' component={ChooseListComponent}/>
          <Route path='/:listid' exact component={ShoppingListContainerWrapperComponent}/>
          <Route path='/:listid/orders' exact component={ShoppingListContainerWrapperComponent}/>
          <Route path='/:listid/orders/:orderid' exact component={ShoppingListContainerWrapperComponent}/>
          <Route path='/:listid/:itemid/category' exact component={ShoppingListContainerWrapperComponent}/>
          <Route component={Error404}/>
        </Switch>
      </BrowserRouter>
    )
  }
}

function Error404(props) {
  return 'Not found 🙁'
}
