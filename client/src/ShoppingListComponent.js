// @flow
import React, { Component } from 'react'
import { withRouter, Link, Route } from 'react-router-dom'
import _ from 'lodash'
import { type ShoppingList, type CompletionItem, type Item, type LocalItem, type CategoryDefinition, type Order, type Change, type UUID, createCookingAmount, getSIUnit, addAmounts } from 'shoppinglist-shared'
import type { ConnectionState, UpdateListTitle, CreateItem, DeleteItem, UpdateItem, SelectOrder, UpdateOrders, SetUsername } from './ShoppingListContainerComponent'
import { type Up } from './HistoryTracker'
import TopBarComponent from './TopBarComponent'
import CreateItemComponent from './CreateItemComponent'
import ShoppingListItemsComponent from './ShoppingListItemsComponent'
import EditOrdersComponent from './EditOrdersComponent'
import ChangesComponent from './ChangesComponent'
import './ShoppingListComponent.css'

type Props = {
  shoppingList: ShoppingList,
  completions: $ReadOnlyArray<CompletionItem>,
  categories: $ReadOnlyArray<CategoryDefinition>,
  orders: $ReadOnlyArray<Order>,
  changes: $ReadOnlyArray<Change>,
  selectedOrder: ?UUID,
  username: ?string,  
  unsyncedChanges: $ReadOnlyArray<Change>,
  connectionState: ConnectionState,
  syncing: boolean,
  lastSyncFailed: boolean,
  dirty: boolean,
  updateListTitle: UpdateListTitle,
  createItem: CreateItem,
  deleteItem: DeleteItem,
  updateItem: UpdateItem,
  selectOrder: SelectOrder,
  updateOrders: UpdateOrders,
  setUsername: SetUsername,
  manualSync: () => void,
  clearLocalStorage: () => void,
  up: Up,
}

export default class ShoppingListComponent extends Component<Props> {
  clearLocalStorage = () => {
    const performClear = window.confirm('This will delete any unsynced data. Continue?')
    if (performClear) {
      this.props.clearLocalStorage()
    }
  }

  componentDidMount() {
    document.title = this.props.shoppingList.title
    // "hide" OrderSelectComponent for mobile (reveal by scrolling up)
    if (window.matchMedia("(max-width: 30rem)").matches) {
      window.scrollTo(0, 38)
    }
  }

  componentWillReceiveProps() {
    document.title = this.props.shoppingList.title
  }

  editUsername = (e: SyntheticEvent<HTMLInputElement>) => {
    this.props.setUsername(e.currentTarget.value)
  }

  convertToCookingAmounts = () =>{
    for (const item of this.props.shoppingList.items) {
      if (item.amount != null) {
        const cookingAmountItem = {
          ...item,
          amount: createCookingAmount(item.amount)
        }
        this.props.updateItem(item.id, cookingAmountItem)
      }
    }
  }

  mergeItems = () => {
    // $FlowFixMe
    const grouped = _.groupBy(this.props.shoppingList.items, item => {
      return JSON.stringify({
        category: item.category == null ? null : item.category,
        unit: item.amount == null ? null : getSIUnit(item.amount),
        name: item.name.trim().toLowerCase()
      })
    })

    // see https://github.com/facebook/flow/issues/2221#issuecomment-366519862
    for (const group of Object.keys(grouped).map(key => grouped[key])) {
      if (group.length > 1) {
        const newItem = {
          ...group[0],
          amount: group.map(item => item.amount).reduce(addAmounts)
        }
        this.props.updateItem(newItem.id, newItem)
        group.slice(1).forEach(item => this.props.deleteItem(item.id, false))
      }
    }
  }

  render() {
    return (
      <div className="ShoppingListComponent">
        <TopBarComponent
          title={this.props.shoppingList.title} connectionState={this.props.connectionState}
          syncing={this.props.syncing} lastSyncFailed={this.props.lastSyncFailed}
          manualSync={this.props.manualSync} updateListTitle={this.props.updateListTitle}
          dirty={this.props.dirty} up={this.props.up}
        />
        <div  className="ShoppingListComponent__body">
          <div className="ShoppingListComponent__section">
            <ShoppingListItemsComponent items={this.props.shoppingList.items} categories={this.props.categories}
              orders={this.props.orders} selectedOrder={this.props.selectedOrder}
              updateItem={this.props.updateItem} deleteItem={this.props.deleteItem}
              selectOrder={this.props.selectOrder} up={this.props.up}
            />
          </div>
          <div className="ShoppingListComponent__section">
            <CreateItemComponent
              changes={this.props.changes} 
              unsyncedChanges={this.props.unsyncedChanges}
              completions={this.props.completions}
              categories={this.props.categories}
              createItem={this.props.createItem} />
          </div>
        </div>
        <footer className="ShoppingListComponent__footer">
          <h2>Tools</h2>
          <label>Username: <input type="text" placeholder="username" defaultValue={this.props.username} onBlur={this.editUsername}/></label>
          <button type="button" onClick={this.convertToCookingAmounts}>Convert to metric units</button>
          <button type="button" onClick={this.mergeItems}>Merge</button>
          <Link to={`/${this.props.shoppingList.id}/orders/`}>Edit Sorting</Link>
          <h2>Debug</h2>
          <button type="button" onClick={this.props.manualSync}>Force Sync</button>
          <button type="button" onClick={this.clearLocalStorage}>Clear Local Storage</button>
          <a href="https://github.com/tstehr/shoppinglist/issues">Report Bugs</a>
        </footer>

        <Route path={`/:listid/orders`} render={({history, match}) =>
          <EditOrdersComponent listid={this.props.shoppingList.id} orders={this.props.orders} categories={this.props.categories}
          updateOrders={this.props.updateOrders} up={this.props.up}/>
        } />
      </div>
    )
  }
}
