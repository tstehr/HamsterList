import React, { Component } from 'react'
import { BrowserRouter, Route, RouteComponentProps, Switch } from 'react-router-dom'
import ChooseListComponent from './ChooseListComponent'
import HistoryTracker, { Up } from './HistoryTracker'
import ShoppingListContainerComponent from './ShoppingListContainerComponent'

const Error404: React.SFC = () => {
  return <>Not found 🙁</>
}

function createShoppingListContainerComponentRender(up: Up) {
  return (props: RouteComponentProps<{ listid: string }>) => {
    return <ShoppingListContainerComponent listid={props.match.params['listid']} up={up} />
  }
}

export default class App extends Component {
  render(): JSX.Element {
    return (
      <BrowserRouter>
        <HistoryTracker
          render={(up: Up) => (
            <Switch>
              <Route exact path="/" component={ChooseListComponent} />
              <Route path="/:listid" exact render={createShoppingListContainerComponentRender(up)} />
              <Route path="/:listid/orders" exact render={createShoppingListContainerComponentRender(up)} />
              <Route path="/:listid/orders/:orderid" exact render={createShoppingListContainerComponentRender(up)} />
              <Route path="/:listid/:itemid/category" exact render={createShoppingListContainerComponentRender(up)} />
              <Route path="/:listid/import" exact render={createShoppingListContainerComponentRender(up)} />
              <Route component={Error404} />
            </Switch>
          )}
        ></HistoryTracker>
      </BrowserRouter>
    )
  }
}
