import { Database } from 'bun:sqlite'

const WAIT_MS = 1_000
const WRITES = 10
const APART_MS = 20

const [file] = process.argv.slice(2)
const db = new Database(file, { strict: true })
db.run(`pragma busy_timeout = ${WAIT_MS}`)

const write = () => {
  try {
    db.run("insert into schema (owner, version) values ('writer', 1) on conflict (owner) do update set version = version + 1")
    return true
  } catch {
    return false
  }
}

let failed = 0
for (let left = WRITES; left > 0; left--) {
  if (!write()) failed++
  await Bun.sleep(APART_MS)
}
db.close()
console.log(JSON.stringify({ failed }))
