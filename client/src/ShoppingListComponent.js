// @flow
import React, { Component } from 'react'
import _ from 'lodash'
import { type ShoppingList, type CompletionItem, type Item, type LocalItem, type CategoryDefinition, createCookingAmount, getSIUnit, addAmounts } from 'shoppinglist-shared'
import type { ConnectionState, UpdateListTitle, CreateItem, DeleteItem, UpdateItem } from './ShoppingListContainerComponent'
import TopBarComponent from './TopBarComponent'
import CreateItemComponent from './CreateItemComponent'
import ShoppingListItemsComponent from './ShoppingListItemsComponent';
import './ShoppingListComponent.css'

type Props = {
  shoppingList: ShoppingList,
  recentlyDeleted: $ReadOnlyArray<LocalItem>,
  completions: $ReadOnlyArray<CompletionItem>,
  categories: $ReadOnlyArray<CategoryDefinition>,
  connectionState: ConnectionState,
  syncing: boolean,
  lastSyncFailed: boolean,
  dirty: boolean,
  updateListTitle: UpdateListTitle,
  createItem: CreateItem,
  deleteItem: DeleteItem,
  updateItem: UpdateItem,
  manualSync: () => void,
  clearLocalStorage: () => void,
}

export default class ShoppingListComponent extends Component<Props> {
  clearLocalStorage = () => {
    const performClear = window.confirm('This will delete any unsynced data and your recently deleted items. Continue?')
    if (performClear) {
      this.props.clearLocalStorage()
    }
  }

  componentDidMount() {
    document.title = this.props.shoppingList.title
  }

  componentWillReceiveProps() {
    document.title = this.props.shoppingList.title
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
          dirty={this.props.dirty}
        />
        <div  className="ShoppingListComponent__body">
          <div className="ShoppingListComponent__section">
            <ShoppingListItemsComponent items={this.props.shoppingList.items} categories={this.props.categories}
              updateItem={this.props.updateItem} deleteItem={this.props.deleteItem}
            />
          </div>
          <div className="ShoppingListComponent__section">
            <CreateItemComponent
              recentlyDeleted={this.props.recentlyDeleted}
              completions={this.props.completions}
              categories={this.props.categories}
              createItem={this.props.createItem} />
          </div>
        </div>
        <div className="ShoppingListComponent__footer">
          <h2>Tools</h2>
          <button type="button" onClick={this.convertToCookingAmounts}>Convert to metric units</button>
          <button type="button" onClick={this.mergeItems}>Merge</button>
          <h2>Debug</h2>
          <button type="button" onClick={this.props.manualSync}>Force Sync</button>
          <button type="button" onClick={this.clearLocalStorage}>Clear Local Storage</button>
        </div>
      </div>
    )
  }
}
