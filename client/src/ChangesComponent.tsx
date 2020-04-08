import classNames from 'classnames'
import differenceInHours from 'date-fns/difference_in_hours'
import differenceInMinutes from 'date-fns/difference_in_minutes'
import distanceInWords from 'date-fns/distance_in_words'
import format from 'date-fns/format'
import { DeepReadonly } from 'deep-freeze'
import _, { isEqual } from 'lodash'
import memoize from 'memoize-one'
import React, { Component, useMemo, useState } from 'react'
import FlipMove from 'react-flip-move'
import { ADD_ITEM, CategoryDefinition, Change, createReverseDiff, DELETE_ITEM, Diff, UPDATE_ITEM } from 'shoppinglist-shared'
import './ChangesComponent.css'
import PillItemComponent from './PillItemComponent'
import { ApplyDiff, CreateApplicableDiff } from './ShoppingListContainerComponent'

interface Props {
  changes: readonly Change[]
  unsyncedChanges: readonly Change[]
  categories: readonly CategoryDefinition[]
  applyDiff: ApplyDiff
  createApplicableDiff: CreateApplicableDiff
}

const defaultDiffLength = 15
const maxDiffLength = 50

export default function ChangesComponent(props: Props): JSX.Element {
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(defaultDiffLength)
  const [detailsExpandedDiff, setDetailsExpandedDiff] = useState<{
    change: Change | undefined | null
    diffIndex: number
  }>({
    change: null,
    diffIndex: NaN,
  }) // changes chronologically

  const allChanges = [...props.changes, ...props.unsyncedChanges] // if the expanded change doesn't exist anymore, search for a recent change containing the same diffs
  // this will in most cases be the equivalent to the unsynced change that was removed during sync

  const expandedChange = useMemo((): Change | undefined | null => {
    const originalExpandedChange = detailsExpandedDiff.change

    if (originalExpandedChange != null && !allChanges.some((c) => c.id === originalExpandedChange.id)) {
      const now = new Date()

      const matchingChange = _.findLast(
        allChanges,
        (c) =>
          differenceInMinutes(now, c.date as Date) <= 5 &&
          _.isEqual(originalExpandedChange.diffs, c.diffs) &&
          originalExpandedChange.username === c.username
      )

      if (matchingChange != null) {
        return matchingChange
      }
    }

    return originalExpandedChange
  }, [detailsExpandedDiff, allChanges])

  const allDiffs = _.flatMap(allChanges, (change, changeIndex) =>
    change.diffs.map((diff, diffIndex) => ({
      change,
      changeIndex,
      unsynced: changeIndex >= props.changes.length,
      diff,
      diffIndex,
    }))
  )

  allDiffs.reverse()

  const undoAll = (diffs: readonly Diff[]): void => {
    for (const diff of diffs) {
      try {
        const reverseDiff = createReverseDiff(diff)
        props.applyDiff(reverseDiff)
      } catch (e) {
        console.error(e)
      }
    }
  }

  const loadOlder = (): void => {
    const newEnd = Math.min(end + defaultDiffLength, allDiffs.length)
    setEnd(newEnd)

    if (newEnd - start > maxDiffLength) {
      setStart(Math.max(newEnd - maxDiffLength, 0))
    }
  }

  const loadNewer = (): void => {
    const newStart = Math.max(start - defaultDiffLength, 0)
    setStart(newStart)

    if (newStart - end > maxDiffLength) {
      setEnd(Math.min(newStart + maxDiffLength, allDiffs.length))
    }
  }

  const reset = (): void => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth',
    })
    setStart(0)
    setEnd(defaultDiffLength)
  }

  const diffs = allDiffs.slice(start, end)
  return (
    <div className="ChangesComponent">
      {start > 0 && (
        <button type="button" className="PaddedButton" onClick={loadNewer}>
          Show newer changes
        </button>
      )}
      <FlipMove
        typeName="ul"
        className="ChangesComponent__list"
        duration="250"
        staggerDelayBy="10"
        enterAnimation="accordionVertical"
        leaveAnimation="accordionVertical"
      >
        {/* <ul className="ChangesComponent__list"> */}
        {diffs.map(({ change, changeIndex, unsynced, diff, diffIndex }, absoluteDiffIndex) => {
          const detailsExpanded =
            expandedChange != null && expandedChange.id === change.id && detailsExpandedDiff.diffIndex === diffIndex
          return (
            <DiffComponent
              key={`${change.id}_${diffIndex}`}
              change={change}
              diff={diff}
              categories={props.categories}
              unsynced={unsynced}
              applyDiff={props.applyDiff}
              createApplicableDiff={props.createApplicableDiff}
              detailsExpanded={detailsExpanded}
              isNewest={absoluteDiffIndex === 0}
              onHeaderClick={() =>
                setDetailsExpandedDiff({
                  change: detailsExpanded ? null : change,
                  diffIndex,
                })
              }
              undoNewer={() => undoAll(diffs.slice(0, absoluteDiffIndex).map(({ diff }) => diff))}
            />
          )
        })}
        {/* </ul> */}
      </FlipMove>
      {end < allDiffs.length && (
        <button type="button" className="PaddedButton" onClick={loadOlder}>
          Show older changes
        </button>
      )}
      {(end !== defaultDiffLength || start !== 0) && (
        <button type="button" className="PaddedButton" onClick={reset}>
          Reset
        </button>
      )}
    </div>
  )
}

interface DiffProps {
  change: Change
  diff: Diff
  categories: readonly CategoryDefinition[]
  unsynced: boolean
  detailsExpanded: boolean
  isNewest: boolean
  applyDiff: ApplyDiff
  createApplicableDiff: CreateApplicableDiff
  undoNewer: () => void
  onHeaderClick: () => void
}

export class DiffComponent extends Component<DiffProps> {
  getDateString = memoize((readonlyDate: DeepReadonly<Date>) => {
    const date = readonlyDate as Date
    const now = new Date()
    const absoluteDateString = format(date, 'YYYY-MM-DD HH:mm')
    const hours = differenceInHours(now, date)
    const dateString = hours < 12 ? `${distanceInWords(now, date)} ago` : absoluteDateString
    return [dateString, absoluteDateString, date.toISOString()]
  }, isEqual)

  getApplicableDiff = (diff: Diff): [Diff | null | undefined, boolean] => {
    const reverseDiff = createReverseDiff(this.props.diff)
    const applicableDiff = this.props.createApplicableDiff(reverseDiff)

    const reverseEqualApplicable = _.isEqual(reverseDiff, applicableDiff)

    return [applicableDiff, reverseEqualApplicable]
  }

  render(): JSX.Element {
    const elClasses = classNames('DiffComponent', {
      'DiffComponent--unsynced': this.props.unsynced,
      'DiffComponent--expanded': this.props.detailsExpanded,
    })
    const [dateString, absoluteDateString, isoDateString] = this.getDateString(this.props.change.date)
    const [applicableDiff, reverseEqualApplicable] = this.getApplicableDiff(this.props.diff)

    const undo = (e: React.SyntheticEvent): void => {
      e.preventDefault()

      if (applicableDiff != null) {
        try {
          this.props.applyDiff(applicableDiff)
        } catch (e) {
          console.error(e)
        }
      }
    }

    const undoNewer = (e: React.SyntheticEvent): void => {
      e.preventDefault()

      if (!window.confirm('Undo all newer changes?')) {
        return
      }

      this.props.undoNewer()
    }

    return (
      <li className={elClasses}>
        <header>
          <button type="button" onClick={this.props.onHeaderClick} className="DiffComponent__headerButton">
            {this.props.change.username != null && this.props.change.username.trim() !== '' ? (
              this.props.change.username
            ) : (
              <em>{this.props.unsynced ? 'You' : 'Anonymus'}</em>
            )}
            :&nbsp;
            {this.createDiffElement(this.props.diff, 'PAST')}
          </button>
        </header>
        <ul className="DiffComponent__details">
          <li>
            <time dateTime={isoDateString} title={absoluteDateString}>
              {dateString}
            </time>
          </li>
          <li>
            {
              // Use a link even if undo isn't possible so focus isn't lost after undo
              // We can't use a button, because we want line breaks to be possible inside the element
            }
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid*/}
            <a
              href="#"
              onClick={undo}
              tabIndex={this.props.detailsExpanded ? 0 : -1}
              role="button"
              className={classNames('DiffComponent__UndoLink', {
                'DiffComponent__UndoLink--disabled': applicableDiff == null,
              })}
            >
              {applicableDiff != null ? (
                <>
                  Undo
                  {!reverseEqualApplicable && <>&nbsp;({this.createDiffElement(applicableDiff, 'PRESENT')})</>}
                </>
              ) : (
                "Can't undo"
              )}
            </a>
          </li>
          <li>
            {
              // Use a link even if undo isn't possible so focus isn't lost after undo
              // We can't use a button, because we want line breaks to be possible inside the element
            }
            {/* eslint-disable-next-line jsx-a11y/anchor-is-valid*/}
            <a
              href="#"
              onClick={undoNewer}
              tabIndex={this.props.detailsExpanded ? 0 : -1}
              role="button"
              className={classNames('DiffComponent__UndoLink', {
                'DiffComponent__UndoLink--disabled': this.props.isNewest,
              })}
            >
              Undo all newer changes
            </a>
          </li>
        </ul>
      </li>
    )
  }

  createDiffElement(diff: Diff, tense: 'PAST' | 'PRESENT'): React.ReactNode {
    const categories = this.props.categories

    switch (diff.type) {
      case UPDATE_ITEM: {
        return (
          <>
            {tense === 'PAST' ? 'Changed' : 'Change'} <PillItemComponent item={diff.oldItem} categories={categories} /> to{' '}
            <PillItemComponent item={diff.item} categories={categories} />
          </>
        )
      }
      case ADD_ITEM: {
        return (
          <>
            {tense === 'PAST' ? 'Added' : 'Add'} <PillItemComponent item={diff.item} categories={categories} />
          </>
        )
      }
      case DELETE_ITEM: {
        return (
          <>
            {tense === 'PAST' ? 'Deleted' : 'Delete'} <PillItemComponent item={diff.oldItem} categories={categories} />
          </>
        )
      }
    }
  }
}
