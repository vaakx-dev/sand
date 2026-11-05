import type { Database } from 'bun:sqlite'

export const newEpoch = (db: Database) => db.run('update sync set epoch = lower(hex(randomblob(8))) where id = 1')
