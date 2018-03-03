import fs from 'fs-extra'
import path from 'path'
import _ from 'lodash'

const PATH = path.resolve(process.argv[2])
console.log(`Reading ${PATH}`)

const db = fs.readJsonSync(PATH)

for (const list of db.lists) {
  if (!list.orders) {
    list.orders = []
  }
}

fs.outputJSON(PATH, db, { spaces: 2 })

console.log('Done')
