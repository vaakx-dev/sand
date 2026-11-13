import type { Database } from 'bun:sqlite'
import type { NewRule, Rule } from '../contract'

export const createRules = (db: Database) => {
  const all = db.query<Rule, []>('select * from permission_rules order by at desc')
  const inserted = db.query('insert into permission_rules (id, owner, conversation, title, tool, verdict, at) values ($id, $owner, $conversation, $title, $tool, $verdict, $at)')
  const removed = db.query('delete from permission_rules where id = $id')
  return {
    list: () => all.all(),
    add(rule: NewRule): Rule {
      const added = { ...rule, id: Bun.randomUUIDv7(), at: Date.now() }
      inserted.run(added)
      return added
    },
    remove: (id: string) => removed.run({ id }).changes > 0,
  }
}
