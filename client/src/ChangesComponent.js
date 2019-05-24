// @flow
import React, { Component, type Element } from 'react'
import _ from 'lodash'
import FlipMove from 'react-flip-move'
import distanceInWordsToNow from 'date-fns/distance_in_words_to_now'
import { type Item, type Change, type Diff, type CategoryDefinition, ADD_ITEM, UPDATE_ITEM, DELETE_ITEM } from 'shoppinglist-shared'
import PillItemComponent from './PillItemComponent'

type Props = {
  changes: $ReadOnlyArray<Change>,
  categories: $ReadOnlyArray<CategoryDefinition>,
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
        {c.diffs.map(d =>
          <div>
            {c.username} - {distanceInWordsToNow(c.date)} ago:&nbsp;
            <DiffComponent diff={d} categories={props.categories} />
          </div> 
        )}
      </div>
    )}
  </FlipMove>)
}

function DiffComponent(props: { diff: Diff, categories: $ReadOnlyArray<CategoryDefinition> }) {
  const diff = props.diff

  if (diff.type === UPDATE_ITEM) {
    return <span>
      Changed <PillItemComponent item={diff.oldItem} categories={props.categories} /> to <PillItemComponent item={diff.item} categories={props.categories} />
    </span>
  }

  if (diff.type === ADD_ITEM) {
    return <span>Added <PillItemComponent item={diff.item} categories={props.categories} /></span>
  }

  if (diff.type === DELETE_ITEM) {
    return <span>Deleted <PillItemComponent item={diff.oldItem} categories={props.categories} /></span>
  }

  (diff: empty)
  throw TypeError(`Diff to be applied is not an element of type 'Diff'`)
}


