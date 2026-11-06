import type { Owner } from '@sand/engine/contract'
import type { Effect } from '@sand/tools/contract'
import type { Database } from 'bun:sqlite'
import type { Decider, Decision, DecisionQuery, Outcome } from '../contract'

interface Row {
  id: string
  owner: Owner
  conversation: string
  title: string
  turn: string
  call: string
  tool: string
  effect: Effect
  summary: string
  outcome: Outcome
  by: Decider | null
  rule: string | null
  at: number
  decided: number | null
}

export interface Settled {
  outcome: Exclude<Outcome, 'waiting'>
  by?: Decider
  rule?: string
}

const decisionOf = ({ by, rule, decided, ...row }: Row): Decision => ({
  ...row,
  ...(by !== null && { by }),
  ...(rule !== null && { rule }),
  ...(decided !== null && { decided }),
})

const listSql = `select * from approvals
  where ($owner is null or owner = $owner) and ($conversation is null or conversation = $conversation) and at < $before
  order by at desc limit $limit`

export const createDecisions = (db: Database) => {
  const inserted = db.query(
    `insert into approvals (id, owner, conversation, title, turn, call, tool, effect, summary, outcome, by, rule, at, decided)
      values ($id, $owner, $conversation, $title, $turn, $call, $tool, $effect, $summary, $outcome, $by, $rule, $at, $decided)`,
  )
  const byCall = db.query<Row, { turn: string; call: string }>('select * from approvals where turn = $turn and call = $call')
  const byId = db.query<Row, { id: string }>('select * from approvals where id = $id')
  const waiting = db.query<Row, []>("select * from approvals where outcome = 'waiting' order by at")
  const settled = db.query<Row, Record<string, string | number | null>>(
    "update approvals set outcome = $outcome, by = $by, rule = $rule, decided = $decided where id = $id and outcome = 'waiting' returning *",
  )
  const listed = db.query<Row, Record<string, string | number | null>>(listSql)
  const pruned = db.query("delete from approvals where outcome != 'waiting' and at < $before")

  return {
    add(decision: Decision) {
      inserted.run({ by: null, rule: null, decided: null, ...decision })
      return decision
    },
    find(turn: string, call: string) {
      const row = byCall.get({ turn, call })
      return row ? decisionOf(row) : undefined
    },
    get(id: string) {
      const row = byId.get({ id })
      return row ? decisionOf(row) : undefined
    },
    waiting: () => waiting.all().map(decisionOf),
    settle(id: string, { outcome, by, rule }: Settled) {
      const row = settled.get({ id, outcome, by: by ?? null, rule: rule ?? null, decided: Date.now() })
      return row ? decisionOf(row) : undefined
    },
    list: ({ owner, conversation, before = Number.MAX_SAFE_INTEGER, limit = 100 }: DecisionQuery = {}) =>
      listed.all({ owner: owner ?? null, conversation: conversation ?? null, before, limit }).map(decisionOf),
    prune: (before: number) => void pruned.run({ before }),
  }
}

export type DecisionStore = ReturnType<typeof createDecisions>
