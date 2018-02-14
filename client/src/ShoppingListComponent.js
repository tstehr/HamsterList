// @flow
import React, { Component } from 'react'
import { type ShoppingList, type CompletionItem, type LocalItem, type CategoryDefinition } from 'shoppinglist-shared'
import type { ConnectionState, UpdateListTitle, CreateItem, DeleteItem, UpdateItem } from './ShoppingListContainerComponent'
import TopBarComponent from './TopBarComponent'
import EditItemComponent from './EditItemComponent'
import CreateItemComponent from './CreateItemComponent'
import KeyFocusComponent from './KeyFocusComponent'
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
          <KeyFocusComponent direction="vertical" rootTagName="ul" className="ShoppingListComponent__section">
          {this.props.shoppingList.items.map((item) =>
              <EditItemComponent  key={item.id} item={item} categories={this.props.categories} deleteItem={this.props.deleteItem} updateItem={this.props.updateItem} />

          )}
          {!this.props.shoppingList.items.length &&
            <div className="ShoppingListComponent__emptyList">
              <p>Empty list, nothing needed <span role="img" aria-label="Party Popper">🎉</span></p>
              <p className="ShoppingListComponent__emptyList__addCallout--singleCol">
                <span role="img" aria-label="Arrow to entry form">⬇️ </span>
                Add some new stuff below
                <span role="img" aria-label="Arrow to entry form">⬇️ </span>
              </p>
              <p className="ShoppingListComponent__emptyList__addCallout--twoCol">
                <span role="img" aria-label="Arrow to entry form">➡️</span>
                Add some new stuff to the right
                <span role="img" aria-label="Arrow to entry form">➡️</span>
              </p>
            </div>
          }
          </KeyFocusComponent>
          <div className="ShoppingListComponent__section">
            <CreateItemComponent
              recentlyDeleted={this.props.recentlyDeleted}
              completions={this.props.completions}
              categories={this.props.categories}
              createItem={this.props.createItem} />
          </div>
        </div>
        <div className="ShoppingListComponent__footer">
          <h2>Debug</h2>
          <button type="button" onClick={this.props.manualSync}>Force Sync</button>
          <button type="button" onClick={this.clearLocalStorage}>Clear Local Storage</button>
        </div>
      </div>
    )
  }
}
