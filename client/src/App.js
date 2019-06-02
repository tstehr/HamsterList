// @flow
import React, { Component } from 'react'
import { type ContextRouter, BrowserRouter, Switch, Route } from 'react-router-dom'
import HistoryTracker, { type Up } from './HistoryTracker'
import ChooseListComponent from './ChooseListComponent'
import ShoppingListContainerComponent from './ShoppingListContainerComponent'


function createShoppingListContainerComponentRender(up: Up) {
  return (props: ContextRouter) => {
    return <ShoppingListContainerComponent listid={props.match.params['listid'] || ''} up={up}/>
  }
}

export default class App extends Component<void> {
  render() {
    return (
      <BrowserRouter>
        <HistoryTracker render={(up) =>
          <Switch>
            <Route exact path='/' component={ChooseListComponent}/>
            <Route path='/:listid' exact render={createShoppingListContainerComponentRender(up)}/>
            <Route path='/:listid/orders' exact render={createShoppingListContainerComponentRender(up)}/>
            <Route path='/:listid/orders/:orderid' exact render={createShoppingListContainerComponentRender(up)}/>
            <Route path='/:listid/:itemid/category' exact render={createShoppingListContainerComponentRender(up)}/>
            <Route component={Error404}/>
          </Switch>
        }>
        </HistoryTracker>
      </BrowserRouter>
    )
  }
}

function Error404(props) {
  return 'Not found 🙁'
}
