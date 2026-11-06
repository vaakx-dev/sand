import type { Owner } from '@sand/engine/contract'
import type { Act } from '@sand/tools/contract'
import { isAbsolute, relative, resolve } from 'node:path'
import type { Mode, Rule, Verdict } from './contract'

export interface Asked {
  owner: Owner
  conversation: string
  cwd: string
  tool: string
  act: Act
}

export interface Ruling {
  verdict: Verdict
  by: 'default' | 'rule'
  rule?: string
}

const strength: Record<Verdict, number> = { deny: 0, ask: 1, allow: 2 }

const within = (cwd: string, path: string) => {
  const rest = relative(cwd, resolve(cwd, path))
  return rest !== '..' && !rest.startsWith('../') && !rest.startsWith('..\\') && !isAbsolute(rest)
}

const writesOwn = ({ cwd, act: { effect, paths = [] } }: Asked) => effect === 'write' && paths.length > 0 && paths.every(path => within(cwd, path))

const matches = (rule: Rule, { owner, conversation, tool, act }: Asked) =>
  rule.owner === owner &&
  (rule.conversation ?? conversation) === conversation &&
  (rule.tool ?? tool) === tool &&
  (rule.effect ?? act.effect) === act.effect

const byDefault = (asked: Asked, mode: Mode): Verdict => {
  const { effect } = asked.act
  if (effect === 'read' || writesOwn(asked)) return 'allow'
  if (effect === 'write' || effect === 'run') return mode === 'careful' ? 'ask' : 'allow'
  return 'ask'
}

export const decide = (rules: Rule[], mode: Mode, asked: Asked): Ruling => {
  const [rule] = rules.filter(found => matches(found, asked)).sort((a, b) => strength[a.verdict] - strength[b.verdict])
  if (rule) return { verdict: rule.verdict, by: 'rule', rule: rule.id }
  return { verdict: byDefault(asked, mode), by: 'default' }
}
