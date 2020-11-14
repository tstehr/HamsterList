import DB, { RESTORATION_ENABLED, RESTORATION_PATH } from 'db'
import React, { useEffect, useRef } from 'react'
import { BrowserRouter, Route, RouteComponentProps, Switch, useHistory, useLocation } from 'react-router-dom'
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

export default function App() {
  return (
    <BrowserRouter>
      <RestorePath />
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

function RestorePath() {
  const dbRef = useRef(new DB())

  // forward on load
  const history = useHistory()
  useEffect(() => {
    if (!dbRef.current.get(RESTORATION_ENABLED)) {
      return
    }
    const restorationPath = dbRef.current.get<string>(RESTORATION_PATH)
    if (restorationPath && window.location.pathname === '/' && restorationPath !== '/') {
      history.replace(restorationPath)
    }
  }, [history])

  // store current path
  const { pathname } = useLocation()
  useEffect(() => {
    dbRef.current.set(RESTORATION_PATH, pathname)
  }, [pathname])

  return null
}
