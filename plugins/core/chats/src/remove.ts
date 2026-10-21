import type { Database } from 'bun:sqlite'
import { newEpoch } from './changes'

export const chatRemover = (db: Database) => {
  const agents = db.query<{ id: string }, { id: string }>("select id from chats where parent = $id and kind = 'agent'")
  const wipe = [
    db.query('delete from entries where session = $session'),
    db.query('delete from changes where session = $session'),
    db.query('delete from chats where id = $session'),
  ]
  const remove = (id: string): string[] => {
    const nested = agents.all({ id }).flatMap(agent => remove(agent.id))
    for (const query of wipe) query.run({ session: id })
    return [id, ...nested]
  }
  return db.transaction((id: string) => {
    const removed = remove(id)
    newEpoch(db)
    return removed
  })
}
