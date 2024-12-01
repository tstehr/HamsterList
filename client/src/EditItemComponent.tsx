import classNames from 'classnames'
import { KEY_FOCUS_COMPONENT_NO_FOCUS } from 'KeyFocusComponent'
import _ from 'lodash'
import React, { useEffect, useRef, useState } from 'react'
import AutosizeTextarea from 'react-autosize-textarea'
import { useParams, useHistory } from 'react-router-dom'
import { CategoryDefinition, createLocalItemFromString, Item, itemToString, LocalItem } from 'hamsterlist-shared'
import CategoryComponent from './CategoryComponent'
import styles from './EditItemComponent.module.css'
import { Up } from './HistoryTracker'
import IconButton from './IconButton'
import ItemComponent from './ItemComponent'
import { DeleteItem, UpdateItem } from './sync'

interface Props {
  item: Item
  categories: readonly CategoryDefinition[]
  deleteItem: DeleteItem
  updateItem: UpdateItem
  up: Up
}

interface State {
  hasFocus: boolean
  isEditing: boolean
  inputValue: string
}

const EditItemComponent = React.memo<Props>(
  function EditItemComponent(props) {
    const inputRef = useRef<HTMLTextAreaElement | null>(null)
    const itemDivRef = useRef<HTMLDivElement | null>(null)

    const [editState, setEditState] = useState<State>({
      hasFocus: false,
      isEditing: false,
      inputValue: itemToString(props.item),
    })

    const saveItem = (): void => {
      const itemFromString: LocalItem = createLocalItemFromString(editState.inputValue, props.categories)
      const updatedItem: LocalItem = { ...itemFromString, category: itemFromString.category ?? props.item.category }
      props.updateItem(props.item.id, updatedItem)
    }

    const handleFocus = (e: React.FocusEvent): void => {
      // Don't treat clicks on focusable children as focus events. This allows links in the item name to be clicked.
      if (
        e.target !== e.currentTarget &&
        e.target instanceof HTMLElement &&
        e.target.tabIndex != null &&
        e.target.tabIndex !== -1
      ) {
        return
      }

      setEditState((prevState) => ({
        hasFocus: true,
        isEditing: prevState.hasFocus ? false : true,
        inputValue: prevState.hasFocus ? prevState.inputValue : itemToString(props.item),
      }))
    }

    const handleBlur = (): void => {
      saveItem()
      setEditState((prevState) => ({ ...prevState, hasFocus: false, isEditing: false }))
    }

    const handleSubmit = (e: React.SyntheticEvent): void => {
      saveItem()
      setEditState((prevState) => ({ ...prevState, isEditing: false }))
      e.preventDefault()
    }

    const handleInputKeyDown = (e: React.KeyboardEvent): void => {
      if (e.key === 'Enter') {
        saveItem()
        setEditState((prevState) => ({ ...prevState, isEditing: false }))
        e.preventDefault()
      }

      if (e.key === 'Escape') {
        setEditState((prevState) => ({ ...prevState, isEditing: false, inputValue: itemToString(props.item) }))
        e.preventDefault()
      }
    }

    const handleChange = (e: React.FormEvent<HTMLTextAreaElement>): void => {
      const inputValue = e.currentTarget.value
      setEditState((prevState) => ({ ...prevState, inputValue }))
    }

    const handleDivKeyDown = (e: React.KeyboardEvent): void => {
      if (e.key === 'Enter') {
        setEditState({ hasFocus: true, isEditing: true, inputValue: itemToString(props.item) })
        e.preventDefault()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        props.deleteItem(props.item.id)
        e.preventDefault()
      }
    }

    const handleDivClick = (): void => {
      setEditState((prevState) => ({ ...prevState, hasFocus: true, isEditing: true, inputValue: itemToString(props.item) }))
    }

    useEffect(() => {
      if (editState.hasFocus) {
        if (inputRef.current != null) {
          inputRef.current.focus()
        } else if (itemDivRef.current != null) {
          itemDivRef.current.focus()
        }
      }
    })

    const history = useHistory()
    const params = useParams<{ listid?: string }>()

    return (
      <li className={styles.EditItemComponent}>
        <button
          type="button"
          className={classNames(styles.Category, KEY_FOCUS_COMPONENT_NO_FOCUS)}
          onClick={() => history.push(`/${params.listid ?? ''}/${props.item.id}/category`)}
        >
          <CategoryComponent categoryId={props.item.category} categories={props.categories} />
        </button>

        {editState.isEditing ? (
          <form onSubmit={handleSubmit} className={styles.Name}>
            <AutosizeTextarea
              type="text"
              value={editState.inputValue}
              onBlur={handleBlur}
              onChange={handleChange}
              onKeyDown={handleInputKeyDown}
              innerRef={(input) => {
                inputRef.current = input
              }}
            />
          </form>
        ) : (
          <div
            className={styles.Name}
            tabIndex={0}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleDivKeyDown}
            onClick={handleDivClick}
            ref={itemDivRef}
          >
            <ItemComponent item={props.item} />
          </div>
        )}
        <IconButton
          onClick={() => props.deleteItem(props.item.id)}
          icon="DELETE"
          alt="Delete"
          className={classNames(styles.Delete, KEY_FOCUS_COMPONENT_NO_FOCUS)}
        />
      </li>
    )
  },
  (prevProps, nextProps) => _.isEqual(prevProps, nextProps),
)

export default EditItemComponent
