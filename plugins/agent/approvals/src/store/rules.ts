import type { Owner } from '@sand/engine/contract'
import type { Effect } from '@sand/tools/contract'
import type { Database } from 'bun:sqlite'
import type { NewRule, Rule, Verdict } from '../contract'

interface Row {
  id: string
  owner: Owner
  conversation: string | null
  title: string | null
  tool: string | null
  effect: Effect | null
  verdict: Verdict
  at: number
}

const ruleOf = (row: Row): Rule => ({
  id: row.id,
  owner: row.owner,
  ...(row.conversation !== null && { conversation: row.conversation }),
  ...(row.title !== null && { title: row.title }),
  ...(row.tool !== null && { tool: row.tool }),
  ...(row.effect !== null && { effect: row.effect }),
  verdict: row.verdict,
  at: row.at,
})

export const createRules = (db: Database) => {
  const listed = db.query<Row, []>('select * from approval_rules order by at desc')
  const same = db.query<Row, Record<string, string | null>>(
    `select * from approval_rules where owner = $owner and conversation is $conversation and tool is $tool and effect is $effect and verdict = $verdict`,
  )
  const inserted = db.query(
    `insert into approval_rules (id, owner, conversation, title, tool, effect, verdict, at)
      values ($id, $owner, $conversation, $title, $tool, $effect, $verdict, $at)`,
  )
  const removed = db.query('delete from approval_rules where id = $id')

  return {
    list: () => listed.all().map(ruleOf),
    add(rule: NewRule): Rule {
      const values = {
        owner: rule.owner,
        conversation: rule.conversation ?? null,
        tool: rule.tool ?? null,
        effect: rule.effect ?? null,
        verdict: rule.verdict,
      }
      const found = same.get(values)
      if (found) return ruleOf(found)
      const added = { ...rule, id: Bun.randomUUIDv7(), at: Date.now() }
      inserted.run({ ...values, title: rule.title ?? null, id: added.id, at: added.at })
      return added
    },
    remove: (id: string) => removed.run({ id }).changes > 0,
  }
}

export type RuleStore = ReturnType<typeof createRules>
