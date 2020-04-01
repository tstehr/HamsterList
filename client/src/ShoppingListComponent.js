// @flow
import React, { Component } from 'react'
import { Link, Route } from 'react-router-dom'
import _ from 'lodash'
import {
  type ShoppingList,
  type CompletionItem,
  type Item,
  type LocalItem,
  type CategoryDefinition,
  type Order,
  type Change,
  type UUID,
  createCookingAmount,
  getSIUnit,
  addAmounts,
} from 'shoppinglist-shared'
import type {
  ConnectionState,
  UpdateListTitle,
  CreateItem,
  DeleteItem,
  UpdateItem,
  SelectOrder,
  UpdateOrders,
  SetUsername,
  ApplyDiff,
  CreateApplicableDiff,
  DeleteCompletion,
} from './ShoppingListContainerComponent'
import { type Up } from './HistoryTracker'
import TopBarComponent, { EditTitleComponent, SyncStatusComponent } from './TopBarComponent'
import CreateItemComponent from './CreateItemComponent'
import ShoppingListItemsComponent from './ShoppingListItemsComponent'
import EditOrdersComponent from './EditOrdersComponent'
import ChooseCategoryComponent from './ChooseCategoryComponent'
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
  applyDiff: ApplyDiff,
  createApplicableDiff: CreateApplicableDiff,
  deleteCompletion: DeleteCompletion,
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
    if (window.matchMedia('(max-width: 30rem)').matches) {
      window.scrollTo(0, 38)
    }
  }

  componentWillReceiveProps() {
    document.title = this.props.shoppingList.title
  }

  editUsername = (e: SyntheticEvent<HTMLInputElement>) => {
    this.props.setUsername(e.currentTarget.value)
  }

  updateCategory = (item: Item, category: ?UUID) => {
    const updatedItem: LocalItem = {
      ...item,
      category: category,
    }
    this.props.updateItem(item.id, updatedItem)
  }

  convertToCookingAmounts = () => {
    for (const item of this.props.shoppingList.items) {
      if (item.amount != null) {
        const cookingAmountItem = {
          ...item,
          amount: createCookingAmount(item.amount),
        }
        this.props.updateItem(item.id, cookingAmountItem)
      }
    }
  }

  mergeItems = () => {
    // $FlowFixMe
    const grouped = _.groupBy(this.props.shoppingList.items, (item) => {
      return JSON.stringify({
        category: item.category == null ? null : item.category,
        unit: item.amount == null ? null : getSIUnit(item.amount),
        name: item.name.trim().toLowerCase(),
      })
    })

    // see https://github.com/facebook/flow/issues/2221#issuecomment-366519862
    for (const group of Object.keys(grouped).map((key) => grouped[key])) {
      if (group.length > 1) {
        const newItem = {
          ...group[0],
          amount: group.map((item) => item.amount).reduce(addAmounts),
        }
        this.props.updateItem(newItem.id, newItem)
        group.slice(1).forEach((item) => this.props.deleteItem(item.id))
      }
    }
  }

  clearList = () => {
    if (!window.confirm('Delete all items?')) {
      return
    }
    for (const item of this.props.shoppingList.items) {
      this.props.deleteItem(item.id)
    }
  }

  shareList = () => {
    window.navigator
      .share({
        title: this.props.shoppingList.title,
        text: 'A shared shopping list',
        url: window.location.href,
      })
      .then((_) => console.log('Yay, you shared it :)'))
      .catch((error) => console.log("Oh noh! You couldn't share it! :'(\n", error))
  }

  render() {
    return (
      <div className="ShoppingListComponent">
        <TopBarComponent up={this.props.up}>
          <EditTitleComponent title={this.props.shoppingList.title} updateListTitle={this.props.updateListTitle} />
          <SyncStatusComponent
            connectionState={this.props.connectionState}
            syncing={this.props.syncing}
            lastSyncFailed={this.props.lastSyncFailed}
            dirty={this.props.dirty}
            manualSync={this.props.manualSync}
          />
        </TopBarComponent>
        <div className="ShoppingListComponent__body">
          <section className="ShoppingListComponent__section" role="main">
            <ShoppingListItemsComponent
              items={this.props.shoppingList.items}
              categories={this.props.categories}
              orders={this.props.orders}
              selectedOrder={this.props.selectedOrder}
              updateItem={this.props.updateItem}
              deleteItem={this.props.deleteItem}
              selectOrder={this.props.selectOrder}
              up={this.props.up}
            />
          </section>
          <section className="ShoppingListComponent__section">
            <CreateItemComponent
              changes={this.props.changes}
              unsyncedChanges={this.props.unsyncedChanges}
              completions={this.props.completions}
              categories={this.props.categories}
              createItem={this.props.createItem}
              deleteCompletion={this.props.deleteCompletion}
              applyDiff={this.props.applyDiff}
              createApplicableDiff={this.props.createApplicableDiff}
            />
          </section>
        </div>
        <footer className="ShoppingListComponent__footer">
          <section>
            <h2>Tools</h2>
            <p>
              <button type="button" className="PaddedButton" onClick={this.shareList}>
                Share
              </button>
            </p>
            <p>
              <label>
                Username:{' '}
                <input type="text" placeholder="username" defaultValue={this.props.username} onBlur={this.editUsername} />
              </label>
            </p>
            <p>
              <button type="button" className="PaddedButton" onClick={this.convertToCookingAmounts}>
                Convert to metric units
              </button>
              <button type="button" className="PaddedButton" onClick={this.mergeItems}>
                Merge
              </button>
              <button type="button" className="PaddedButton" onClick={this.clearList}>
                Clear List
              </button>
              <Link to={`/${this.props.shoppingList.id}/orders/`}>Edit Sorting</Link>
            </p>
          </section>
          <section>
            <h2>Debug</h2>
            <p>
              <button type="button" className="PaddedButton" onClick={this.props.manualSync}>
                Force Sync
              </button>
              <button type="button" className="PaddedButton" onClick={this.clearLocalStorage}>
                Clear Local Storage
              </button>
            </p>
            <p>
              <a href="https://github.com/tstehr/shoppinglist/issues">Report Bugs</a>
            </p>
            <p>Version: {process.env.REACT_APP_GIT_SHA || 'No version information found!'}</p>
          </section>
        </footer>

        <Route
          path={`/:listid/orders`}
          render={({ history, match }) => (
            <EditOrdersComponent
              listid={this.props.shoppingList.id}
              orders={this.props.orders}
              categories={this.props.categories}
              updateOrders={this.props.updateOrders}
              up={this.props.up}
            />
          )}
        />
        <Route
          path={`/:listid/:itemid/category`}
          render={({ history, match }) => {
            const item = this.props.shoppingList.items.find((i) => i.id === match.params['itemid'])
            if (item == null) {
              history.replace(`/${match.params['listid'] || ''}`)
              return null
            }
            return (
              <ChooseCategoryComponent
                categories={this.props.categories}
                categoryId={item.category}
                updateCategory={(category) => {
                  this.updateCategory(item, category)
                  this.props.up('list')
                }}
              />
            )
          }}
        />
      </div>
    )
  }
}
