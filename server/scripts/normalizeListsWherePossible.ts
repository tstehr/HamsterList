import fs from 'fs-extra'
import path from 'path'
import _ from 'lodash'
import normalizeListid from '../src/util/normalizeListid'
import { DBContents } from '../src/DB'

const PATH = path.resolve(process.argv[2])
console.log(`Reading ${PATH}`)

const db: DBContents = fs.readJsonSync(PATH)
const normalizedToId = new Map<string, string[]>()

for (const list of db.lists) {
  const normalizedId = normalizeListid(list.id)

  let unnormalizedIds = normalizedToId.get(normalizedId)
  if (!unnormalizedIds) {
    unnormalizedIds = [list.id]
    normalizedToId.set(normalizedId, unnormalizedIds)
  } else {
    unnormalizedIds.push(list.id)
  }
}

const idToNormalized = new Map<string, string>()

for (const [normalizedId, unnormalizedIds] of normalizedToId.entries()) {
  if (unnormalizedIds.length > 1) {
    console.log('Skipped', [normalizedId, unnormalizedIds])
    continue
  }
  const [unnormalizedId] = unnormalizedIds
  if (normalizedId === unnormalizedId) {
    continue
  }
  idToNormalized.set(unnormalizedId, normalizedId)
}

for (const list of db.lists) {
  const normalizedId = idToNormalized.get(list.id)
  if (normalizedId) {
    list.id = normalizedId
  }
}

fs.outputJSON(PATH, db, { spaces: 2 })

console.log('Done')
