// @flow
import React, { Component, Element } from 'react'
import _ from 'lodash'
import FlipMove from 'react-flip-move'
import distanceInWordsToNow from 'date-fns/distance_in_words_to_now'
import { type Change, type Diff, ADD_ITEM, UPDATE_ITEM, DELETE_ITEM, itemToString } from 'shoppinglist-shared'
import ItemComponent from './ItemComponent'

type Props = {
  changes: $ReadOnlyArray<Change>,
}

export default function ChangesComponent(props: Props) {
  const changes = [...props.changes.slice(props.changes.length - 10, props.changes.length)]
  changes.reverse()
  return (<FlipMove
    typeName={null} duration="250" staggerDurationBy="10" staggerDelayBy="10"
    enterAnimation="accordionVertical" leaveAnimation="accordionVertical"
  >
    {changes.map(c =>
      <div key={c.date.toISOString() + '_' + c.id}>
        <h2>{c.username} - {distanceInWordsToNow(c.date)} ago</h2>
        {c.diffs.map(d =>
          <div>{createDiffElement(d)}</div>
        )}
      </div>
    )}
  </FlipMove>)
}

function createDiffElement(diff: Diff): Element<*> {
  if (diff.type === UPDATE_ITEM) {
    return <span>Changed <ItemComponent item={diff.oldItem} /> to <ItemComponent item={diff.item} /></span>
  }

  if (diff.type === ADD_ITEM) {
    return <span>Added <ItemComponent item={diff.item} /></span>
  }

  if (diff.type === DELETE_ITEM) {
    return <span>Deleted <ItemComponent item={diff.oldItem} /></span>
  }

  (diff: empty)
  throw TypeError(`Diff to be applied is not an element of type 'Diff'`)
}
