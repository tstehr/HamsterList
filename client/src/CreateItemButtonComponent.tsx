import ChooseCategoryComponent from 'ChooseCategoryComponent'
import classNames from 'classnames'
import { Up } from 'HistoryTracker'
import { KEY_FOCUS_COMPONENT_NO_FOCUS } from 'KeyFocusComponent'
import React, { useState } from 'react'
import { Route, RouteComponentProps, useHistory, useParams } from 'react-router-dom'
import { CategoryDefinition, LocalItem, UUID } from 'hamsterlist-shared'
import CategoryComponent from './CategoryComponent'
import styles from './CreateItemButtonComponent.module.css'
import IconButton from './IconButton'
import globalStyles from './index.module.css'
import ItemComponent from './ItemComponent'
import { CreateItem, DeleteCompletion } from './sync'

interface Props {
  item: LocalItem
  itemRepr: string
  categories: readonly CategoryDefinition[]
  createItem: CreateItem
  deleteCompletion: DeleteCompletion | null
  updateCategory: (categoryId: UUID | null | undefined) => void
  focusInput: () => void
  focused?: boolean
  noArrowFocus?: boolean
  up: Up
}

export default function CreateItemButtonComponent(props: Props) {
  const [enterPressed, setEnterPressed] = useState(false)
  const [createButtonFocused, setCreateButtonFocused] = useState(false)

  const className = classNames(globalStyles.Button, styles.CreateItemButtonComponent, {
    [styles.focused]: props.focused ?? createButtonFocused,
  })
  const buttonClassName = classNames(styles.Button, {
    [KEY_FOCUS_COMPONENT_NO_FOCUS]: props.noArrowFocus,
  })

  const history = useHistory()
  const params = useParams<{ listid?: string }>()

  return (
    <>
      <div className={className}>
        <button
          className={classNames(styles.CategoryButton, KEY_FOCUS_COMPONENT_NO_FOCUS)}
          onClick={() => history.push(`/${params.listid ?? ''}/newItem/${encodeURIComponent(props.itemRepr)}/category`)}
        >
          <CategoryComponent categoryId={props.item.category} categories={props.categories} />
        </button>
        <button
          className={buttonClassName}
          onClick={(): void => {
            props.createItem(props.item)

            if (enterPressed) {
              props.focusInput()
            }
          }}
          onKeyDown={(e: React.KeyboardEvent): void => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
              if (props.deleteCompletion) {
                props.deleteCompletion(props.item.name)
                e.preventDefault()
                props.focusInput()
              }
            } else if (e.key === 'Enter') {
              setEnterPressed(true)
            }
          }}
          onKeyUp={(e: React.KeyboardEvent): void => {
            if (e.key === 'Enter') {
              setEnterPressed(false)
            }
          }}
          onFocus={(): void => {
            setCreateButtonFocused(true)
          }}
          onBlur={(): void => {
            setCreateButtonFocused(false)
          }}
        >
          <ItemComponent item={props.item} />
        </button>
        {props.deleteCompletion && (
          <IconButton
            onClick={() => (props.deleteCompletion ? props.deleteCompletion(props.item.name) : undefined)}
            icon="DELETE"
            alt="Delete completion"
            className={classNames(styles.IconButton, KEY_FOCUS_COMPONENT_NO_FOCUS)}
          />
        )}
      </div>
      <Route
        path={`/:listid/newItem/:itemRepr/category`}
        render={({ match }: RouteComponentProps<{ listid: string; itemRepr: string }>) => {
          if (decodeURIComponent(match.params.itemRepr) !== props.itemRepr) {
            return null
          }
          return (
            <ChooseCategoryComponent
              categories={props.categories}
              categoryId={props.item.category}
              updateCategory={(categoryId) => {
                if (categoryId !== props.item.category) {
                  props.updateCategory(categoryId)
                }
                props.up('list')
              }}
            />
          )
        }}
      />
    </>
  )
}
