import type { Database } from 'bun:sqlite'
import type { Use } from '@sand/tools/contract'
import type { Blocked, Decider, Decision, DecisionQuery, Late, Outcome } from '../contract'

type Row = Omit<Decision, 'uses' | 'once' | 'blocked' | 'by' | 'reason' | 'rule' | 'late' | 'deadline' | 'decided'> & {
  uses: Use | null
  key: string
  once: number
  blocked: string
  by: Decider | null
  reason: string | null
  rule: string | null
  late: Late | null
  deadline: number | null
  decided: number | null
}

export type Logged = Decision & { key: string }

export interface Settled {
  outcome: Exclude<Outcome, 'waiting'>
  by?: Decider
  rule?: string
}

const keptOpenMs = 24 * 60 * 60 * 1000

const decisionOf = ({ key: _key, uses, once, blocked, by, reason, rule, late, deadline, decided, ...row }: Row): Decision => ({
  ...row,
  once: once === 1,
  ...(uses !== null && { uses }),
  blocked: JSON.parse(blocked) as Blocked[],
  ...(by !== null && { by }),
  ...(reason !== null && { reason }),
  ...(rule !== null && { rule }),
  ...(late !== null && { late }),
  ...(deadline !== null && { deadline }),
  ...(decided !== null && { decided }),
})

const listSql = `select * from permission_decisions
  where ($owner is null or owner = $owner) and ($conversation is null or conversation = $conversation) and at < $before
  order by at desc, rowid desc limit $limit`

export const createDecisions = (db: Database) => {
  const inserted = db.query(
    `insert into permission_decisions (id, owner, conversation, title, turn, call, tool, effect, uses, summary, key, mode, once, outcome, by, reason, rule, blocked, late, at, deadline, decided)
      values ($id, $owner, $conversation, $title, $turn, $call, $tool, $effect, $uses, $summary, $key, $mode, $once, $outcome, $by, $reason, $rule, $blocked, null, $at, $deadline, $decided)`,
  )
  const byId = db.query<Row, { id: string }>('select * from permission_decisions where id = $id')
  const open = db.query<Row, { since: number }>(
    "select * from permission_decisions where outcome = 'waiting' or (outcome = 'expired' and late is null and decided > $since) order by at, rowid",
  )
  const settled = db.query<Row, Record<string, string | number | null>>(
    "update permission_decisions set outcome = $outcome, by = $by, rule = $rule, decided = $decided where id = $id and outcome = 'waiting' returning *",
  )
  const answeredLate = db.query<Row, { id: string; late: Late }>(
    "update permission_decisions set late = $late where id = $id and outcome = 'expired' and late is null returning *",
  )
  const granted = db.query<Row, { owner: string; conversation: string; key: string }>(
    `update permission_decisions set late = 'used' where id = (
      select id from permission_decisions where owner = $owner and conversation = $conversation and key = $key and late = 'allowed' order by at limit 1
    ) returning *`,
  )
  const listed = db.query<Row, Record<string, string | number | null>>(listSql)
  const pruned = db.query("delete from permission_decisions where outcome != 'waiting' and at < $before")

  const found = (row: Row | null) => (row ? decisionOf(row) : undefined)

  return {
    add({ key, ...decision }: Logged): Decision {
      const { uses, by, reason, rule, deadline, decided } = decision
      inserted.run({
        ...decision,
        key,
        uses: uses ?? null,
        once: decision.once ? 1 : 0,
        blocked: JSON.stringify(decision.blocked),
        by: by ?? null,
        reason: reason ?? null,
        rule: rule ?? null,
        deadline: deadline ?? null,
        decided: decided ?? null,
      })
      return decision
    },
    get: (id: string) => found(byId.get({ id })),
    open: () => open.all({ since: Date.now() - keptOpenMs }).map(decisionOf),
    settle: (id: string, { outcome, by, rule }: Settled) => found(settled.get({ id, outcome, by: by ?? null, rule: rule ?? null, decided: Date.now() })),
    answerLate: (id: string, late: Late) => found(answeredLate.get({ id, late })),
    takeGrant: (owner: string, conversation: string, key: string) => found(granted.get({ owner, conversation, key })),
    list: ({ owner, conversation, before = Number.MAX_SAFE_INTEGER, limit = 100 }: DecisionQuery = {}) =>
      listed.all({ owner: owner ?? null, conversation: conversation ?? null, before, limit }).map(decisionOf),
    prune: (before: number) => void pruned.run({ before }),
  }
}

export type DecisionStore = ReturnType<typeof createDecisions>
