import fs from 'fs-extra'
import path from 'path'
import _ from 'lodash'

const PATH = path.resolve(process.argv[2])
console.log(`Reading ${PATH}`)

const db = fs.readJsonSync(PATH)

for (const list of db.lists) {
  const recentlyUsedByName = _.groupBy(list.recentlyUsed, 'item.name')
  const newRecentlyUsed = Object.values(recentlyUsedByName).map(rus => {
    const ruWithCategory = _.findLast(rus, ru => ru.item.category != null)
    return {
      lastUsedTimestamp: Math.max(...rus.map(ru => ru.lastUsedTimestamp)),
      uses: rus.reduce((acc, ru) => acc + ru.uses, 0),
      item: {
        name: rus[0].item.name,
        category: ruWithCategory ? ruWithCategory.item.category : null
      }
    }
  })
  list.recentlyUsed = newRecentlyUsed
}

fs.outputJSON(PATH, db, { spaces: 2 })

console.log('Done')
