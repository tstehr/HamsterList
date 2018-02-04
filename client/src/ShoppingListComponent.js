// @flow
import React, { Component } from 'react'
import { type ShoppingList, type CompletionItem, type LocalItem, type CategoryDefinition } from 'shoppinglist-shared'
import type { ConnectionState, CreateItem, DeleteItem, UpdateItem, ManualSync } from './ShoppingListContainerComponent'
import TopBarComponent from './TopBarComponent'
import EditItemComponent from './EditItemComponent'
import CreateItemComponent from './CreateItemComponent'
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
  createItem: CreateItem,
  deleteItem: DeleteItem,
  updateItem: UpdateItem,
  manualSync: ManualSync,
}

export default class ShoppingListComponent extends Component<Props> {
  render() {
    return (
      <div className="ShoppingListComponent">
        <TopBarComponent
          title={this.props.shoppingList.title} connectionState={this.props.connectionState}
          syncing={this.props.syncing} lastSyncFailed={this.props.lastSyncFailed} manualSync={this.props.manualSync}
          dirty={this.props.dirty}
        />
        <div  className="ShoppingListComponent__body">
          <ul className="ShoppingListComponent__section">
            {this.props.shoppingList.items.map((item) =>
              <EditItemComponent  key={item.id} item={item} categories={this.props.categories} deleteItem={this.props.deleteItem} updateItem={this.props.updateItem} />
            )}
          </ul>
          <div className="ShoppingListComponent__section">
            <CreateItemComponent
              recentlyDeleted={this.props.recentlyDeleted}
              completions={this.props.completions}
              categories={this.props.categories}
              createItem={this.props.createItem} />
          </div>
        </div>
        <div className="ShoppingListComponent__footer">
          platzhlter
        </div>
      </div>
    )
  }
}
