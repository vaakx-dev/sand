import type { ConversationRef } from '@sand/engine/contract'
import type { Act } from '@sand/tools/contract'
import { isAbsolute, relative, resolve } from 'node:path'
import type { Rule } from './contract'

export interface Asked {
  chain: ConversationRef[]
  strict: boolean
  cwd: string
  tool: string
  act: Act
}

export type Ruling =
  | { verdict: 'allow'; by: 'default' }
  | { verdict: 'allow'; by: 'rule'; rule: string }
  | { verdict: 'deny'; rule: string }
  | { verdict: 'ask'; once: boolean }

const within = (cwd: string, path: string) => {
  const rest = relative(cwd, resolve(cwd, path))
  return rest !== '..' && !rest.startsWith('../') && !rest.startsWith('..\\') && !isAbsolute(rest)
}

const inFolder = ({ cwd, act: { paths = [] } }: Asked) => paths.every(path => within(cwd, path))

const trusted = ({ strict, act }: Asked) => !(strict && act.uses)

const free = (asked: Asked) => {
  const { effect, uses } = asked.act
  if (effect === 'read' || effect === 'write') return inFolder(asked)
  return uses === 'agents'
}

const matches = (rule: Rule, { chain, tool }: Asked) =>
  rule.tool === tool && chain.some(({ owner, id }) => rule.owner === owner && rule.conversation === id)

const ruleFor = (rules: Rule[], asked: Asked) => {
  const found = rules.filter(rule => matches(rule, asked))
  return found.find(rule => rule.verdict === 'deny') ?? found[0]
}

export const decide = (rules: Rule[], asked: Asked): Ruling => {
  const rule = ruleFor(rules, asked)
  if (rule?.verdict === 'deny') return { verdict: 'deny', rule: rule.id }
  if (!trusted(asked)) return { verdict: 'ask', once: true }
  if (rule) return { verdict: 'allow', by: 'rule', rule: rule.id }
  if (free(asked)) return { verdict: 'allow', by: 'default' }
  return { verdict: 'ask', once: false }
}
