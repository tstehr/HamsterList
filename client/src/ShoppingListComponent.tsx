import EditOrdersComponent from 'EditOrdersComponent'
import Frame from 'Frame'
import _ from 'lodash'
import React, { Component } from 'react'
import { Link, Route, RouteComponentProps, Switch } from 'react-router-dom'
import {
  addAmounts,
  CategoryDefinition,
  Change,
  CompletionItem,
  createCookingAmount,
  getSIUnit,
  Item,
  LocalItem,
  Order,
  ShoppingList,
  UUID,
} from 'hamsterlist-shared'
import ChooseCategoryComponent from './ChooseCategoryComponent'
import CreateItemComponent from './CreateItemComponent'
import { Up } from './HistoryTracker'
import ImportComponent from './ImportComponent'
import globalStyles from './index.module.css'
import ShoppingListItemsComponent from './ShoppingListItemsComponent'
import {
  AddCompletion,
  ApplyDiff,
  ConnectionState,
  CreateApplicableDiff,
  CreateItem,
  DeleteCompletion,
  DeleteItem,
  ModifyCompletions,
  PerformTransaction,
  SelectOrder,
  SetUsername,
  UpdateCategories,
  UpdateItem,
  UpdateListTitle,
  UpdateOrders,
} from './sync'
import TopBarComponent, { EditTitleComponent, SyncStatusComponent } from './TopBarComponent'

interface Props {
  shoppingList: ShoppingList
  completions: readonly CompletionItem[]
  categories: readonly CategoryDefinition[]
  orders: readonly Order[]
  changes: readonly Change[]
  selectedOrder: UUID | undefined | null
  username: string | undefined | null
  unsyncedChanges: readonly Change[]
  connectionState: ConnectionState
  syncing: boolean
  lastSyncFailed: boolean
  dirty: boolean
  updateListTitle: UpdateListTitle
  createItem: CreateItem
  deleteItem: DeleteItem
  updateItem: UpdateItem
  updateCategories: UpdateCategories
  selectOrder: SelectOrder
  updateOrders: UpdateOrders
  setUsername: SetUsername
  applyDiff: ApplyDiff
  createApplicableDiff: CreateApplicableDiff
  deleteCompletion: DeleteCompletion
  addCompletion: AddCompletion
  modifyCompletions: ModifyCompletions
  manualSync: () => void
  removeListFromDB: () => void
  performTransaction: PerformTransaction
  up: Up
}

export default class ShoppingListComponent extends Component<Props> {
  removeListFromDB = (): void => {
    const performClear = window.confirm('This will delete any unsynced data. Continue?')

    if (performClear) {
      this.props.removeListFromDB()
    }
  }

  componentDidMount(): void {
    document.title = this.props.shoppingList.title // "hide" OrderSelectComponent for mobile (reveal by scrolling up)

    if (window.matchMedia('(max-width: 30rem)').matches) {
      window.scrollTo(0, 38)
    }
  }

  componentDidUpdate(): void {
    document.title = this.props.shoppingList.title
  }

  editUsername = (e: React.SyntheticEvent<HTMLInputElement>): void => {
    this.props.setUsername(e.currentTarget.value)
  }

  updateCategory = (item: Item, category?: UUID | null): void => {
    const updatedItem: LocalItem = { ...item, category: category }
    this.props.updateItem(item.id, updatedItem)
  }

  convertToCookingAmounts = (): void => {
    for (const item of this.props.shoppingList.items) {
      if (item.amount != null) {
        const cookingAmountItem = { ...item, amount: createCookingAmount(item.amount) }
        this.props.updateItem(item.id, cookingAmountItem)
      }
    }
  }

  mergeItems = (): void => {
    this.props.performTransaction(() => {
      const grouped = _.groupBy(this.props.shoppingList.items, (item) => {
        return JSON.stringify({
          category: item.category ?? null,
          unit: item.amount == null ? null : getSIUnit(item.amount),
          name: item.name.trim().toLowerCase(),
        })
      })

      for (const group of Object.keys(grouped).map((key) => grouped[key])) {
        if (group.length > 1) {
          const newItem = { ...group[0], amount: group.map((item) => item.amount).reduce(addAmounts) }
          this.props.updateItem(newItem.id, newItem)
          group.slice(1).forEach((item) => this.props.deleteItem(item.id))
        }
      }
    })
  }

  deleteNegativeAmountItems = (): void => {
    this.props.performTransaction(() => {
      const negativeItems = this.props.shoppingList.items.filter((item) => item.amount && item.amount.value < 0)
      negativeItems.forEach((item) => this.props.deleteItem(item.id))
    })
  }

  clearList = (): void => {
    if (!window.confirm('Delete all items?')) {
      return
    }

    this.props.performTransaction(() => {
      for (const item of this.props.shoppingList.items) {
        this.props.deleteItem(item.id)
      }
    })
  }

  shareList = async (): Promise<void> => {
    if (!window.navigator.share) {
      alert("Your browser doesn't support the share API")
      return
    }
    try {
      await window.navigator.share({
        title: this.props.shoppingList.title,
        text: 'A shared shopping list',
        url: window.location.href,
      })
      console.log('Yay, you shared it')
    } catch (error) {
      console.log("Oh noh! You couldn't share it! :'(\n", error)
    }
  }

  renderFooter() {
    return (
      <>
        <section>
          <h2>Tools</h2>
          <p>
            <button
              type="button"
              className={globalStyles.PaddedButton}
              onClick={() => {
                this.shareList().catch(console.error)
              }}
            >
              Share
            </button>
          </p>
          <p>
            <label>
              Username:{' '}
              <input type="text" placeholder="username" defaultValue={this.props.username ?? ''} onBlur={this.editUsername} />
            </label>
          </p>
          <p>
            <button type="button" className={globalStyles.PaddedButton} onClick={this.convertToCookingAmounts}>
              Convert to metric units
            </button>
            <button type="button" className={globalStyles.PaddedButton} onClick={this.mergeItems}>
              Merge
            </button>
            <button type="button" className={globalStyles.PaddedButton} onClick={this.clearList}>
              Clear List
            </button>
          </p>
          <p>
            <Link to={`/${this.props.shoppingList.id}/orders/`}>Edit Categories and Sorting</Link>{' '}
            <Link to={`/${this.props.shoppingList.id}/import/`}>Import</Link>
          </p>
        </section>
        <section>
          <h2>Debug</h2>
          <p>
            <button type="button" className={globalStyles.PaddedButton} onClick={this.props.manualSync}>
              Force Sync
            </button>
            <button type="button" className={globalStyles.PaddedButton} onClick={this.removeListFromDB}>
              Clear Local Storage
            </button>
            <button type="button" className={globalStyles.PaddedButton} onClick={this.deleteNegativeAmountItems}>
              Delete items with negative amounts
            </button>
          </p>
          <p>
            <a href="https://github.com/tstehr/HamsterList/issues">Report Bugs</a>
          </p>
          <p>Version: {import.meta.env.VITE_GIT_SHA ?? 'No version information found!'}</p>
        </section>
      </>
    )
  }

  render(): JSX.Element {
    return (
      <>
        <Switch>
          <Route path={`/:listid/orders`}>
            <Frame>
              {{
                topBar: (
                  <TopBarComponent back={() => this.props.up(1)}>
                    <EditTitleComponent title={this.props.shoppingList.title} updateListTitle={this.props.updateListTitle} />
                    <SyncStatusComponent
                      connectionState={this.props.connectionState}
                      syncing={this.props.syncing}
                      lastSyncFailed={this.props.lastSyncFailed}
                      dirty={this.props.dirty}
                      manualSync={this.props.manualSync}
                    />
                  </TopBarComponent>
                ),
                sections: [
                  <EditOrdersComponent
                    key="EditOrdersComponent"
                    listid={this.props.shoppingList.id}
                    orders={this.props.orders}
                    categories={this.props.categories}
                    updateCategories={this.props.updateCategories}
                    updateOrders={this.props.updateOrders}
                    up={this.props.up}
                  />,
                ],
                footer: this.renderFooter(),
              }}
            </Frame>
          </Route>

          <Route path={`/:listid/import`}>
            <Frame>
              {{
                topBar: (
                  <TopBarComponent back={() => this.props.up('list')}>
                    <EditTitleComponent title={this.props.shoppingList.title} updateListTitle={this.props.updateListTitle} />
                    <SyncStatusComponent
                      connectionState={this.props.connectionState}
                      syncing={this.props.syncing}
                      lastSyncFailed={this.props.lastSyncFailed}
                      dirty={this.props.dirty}
                      manualSync={this.props.manualSync}
                    />
                  </TopBarComponent>
                ),
                sections: [
                  <ImportComponent
                    key="ImportComponent"
                    listid={this.props.shoppingList.id}
                    items={this.props.shoppingList.items}
                    completions={this.props.completions}
                    categories={this.props.categories}
                    orders={this.props.orders}
                    createItem={this.props.createItem}
                    deleteItem={this.props.deleteItem}
                    updateCategories={this.props.updateCategories}
                    updateOrders={this.props.updateOrders}
                    modifyCompletions={this.props.modifyCompletions}
                    close={() => this.props.up('list')}
                  />,
                ],
                footer: this.renderFooter(),
              }}
            </Frame>
          </Route>

          <Route>
            <Frame>
              {{
                topBar: (
                  <TopBarComponent back={() => this.props.up('home')}>
                    <EditTitleComponent title={this.props.shoppingList.title} updateListTitle={this.props.updateListTitle} />
                    <SyncStatusComponent
                      connectionState={this.props.connectionState}
                      syncing={this.props.syncing}
                      lastSyncFailed={this.props.lastSyncFailed}
                      dirty={this.props.dirty}
                      manualSync={this.props.manualSync}
                    />
                  </TopBarComponent>
                ),
                sections: [
                  <ShoppingListItemsComponent
                    key="ShoppingListItemsComponent"
                    items={this.props.shoppingList.items}
                    categories={this.props.categories}
                    orders={this.props.orders}
                    selectedOrder={this.props.selectedOrder}
                    updateItem={this.props.updateItem}
                    deleteItem={this.props.deleteItem}
                    selectOrder={this.props.selectOrder}
                    up={this.props.up}
                  />,
                  <CreateItemComponent
                    key="CreateItemComponent"
                    changes={this.props.changes}
                    unsyncedChanges={this.props.unsyncedChanges}
                    completions={this.props.completions}
                    categories={this.props.categories}
                    createItem={this.props.createItem}
                    deleteCompletion={this.props.deleteCompletion}
                    addCompletion={this.props.addCompletion}
                    applyDiff={this.props.applyDiff}
                    createApplicableDiff={this.props.createApplicableDiff}
                    up={this.props.up}
                    performTransaction={this.props.performTransaction}
                  />,
                ],
                footer: this.renderFooter(),
              }}
            </Frame>
          </Route>
        </Switch>

        <Route
          path={`/:listid/:itemid/category`}
          render={({ history, match }: RouteComponentProps<{ itemid: string; listid: string }>) => {
            const item = this.props.shoppingList.items.find((i) => i.id === match.params.itemid)

            if (item == null) {
              history.replace(`/${match.params.listid || ''}`)
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
      </>
    )
  }
}
