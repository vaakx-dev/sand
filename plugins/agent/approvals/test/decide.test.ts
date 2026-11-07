import type { Owner } from '@sand/engine/contract'
import type { Act } from '@sand/tools/contract'
import { expect, test } from 'bun:test'
import { join } from 'node:path'
import type { Rule } from '../src/contract'
import { decide } from '../src/decide'

const cwd = join(import.meta.dir, 'work')

const asked = (owner: Owner, act: Act, tool = 'tool', conversation = 'c1') => ({ owner, conversation, cwd, tool, act })

const rule = (fields: Partial<Rule> & Pick<Rule, 'verdict'>): Rule => ({ id: fields.verdict, owner: 'bot', at: 0, ...fields })

const verdict = (owner: Owner, act: Act, mode: 'trusted' | 'careful' = 'trusted') => decide([], mode, asked(owner, act)).verdict

test('threads keep running commands and changing files freely, and ask before they send, spend or delete', () => {
  expect(verdict('thread', { effect: 'read', paths: ['/etc/hosts'] })).toBe('allow')
  expect(verdict('thread', { effect: 'write', paths: ['notes.md'] })).toBe('allow')
  expect(verdict('thread', { effect: 'write', paths: ['../elsewhere.md'] })).toBe('allow')
  expect(verdict('thread', { effect: 'run' })).toBe('allow')
  expect(verdict('thread', { effect: 'send' })).toBe('ask')
  expect(verdict('thread', { effect: 'spend' })).toBe('ask')
  expect(verdict('thread', { effect: 'delete', paths: ['notes.md'] })).toBe('ask')
})

test('careful threads also ask before commands and changes outside their folder', () => {
  expect(verdict('thread', { effect: 'write', paths: ['src/a.ts', join(cwd, 'b.ts')] }, 'careful')).toBe('allow')
  expect(verdict('thread', { effect: 'write', paths: ['src/a.ts', '../b.ts'] }, 'careful')).toBe('ask')
  expect(verdict('thread', { effect: 'write' }, 'careful')).toBe('ask')
  expect(verdict('thread', { effect: 'run' }, 'careful')).toBe('ask')
  expect(verdict('thread', { effect: 'read' }, 'careful')).toBe('allow')
})

test('bots get the same defaults as threads', () => {
  const acts: Act[] = [
    { effect: 'read' },
    { effect: 'write', paths: [join(cwd, 'memory', 'people.md')] },
    { effect: 'write', paths: [join(cwd, '..', 'other', 'memory.md')] },
    { effect: 'write' },
    { effect: 'run' },
    { effect: 'send' },
    { effect: 'spend' },
    { effect: 'delete' },
  ]
  for (const mode of ['trusted', 'careful'] as const)
    expect(acts.map(act => verdict('bot', act, mode))).toEqual(acts.map(act => verdict('thread', act, mode)))
})

test('saved rules beat the defaults, deny beats ask and ask beats allow', () => {
  const send = asked('bot', { effect: 'send' }, 'mail')
  const allow = rule({ verdict: 'allow', conversation: 'c1', tool: 'mail' })
  const ask = rule({ verdict: 'ask', effect: 'send' })
  const deny = rule({ verdict: 'deny', tool: 'mail' })

  expect(decide([allow], 'trusted', send)).toEqual({ verdict: 'allow', by: 'rule', rule: 'allow' })
  expect(decide([allow, ask], 'trusted', send)).toEqual({ verdict: 'ask', by: 'rule', rule: 'ask' })
  expect(decide([allow, ask, deny], 'trusted', send)).toEqual({ verdict: 'deny', by: 'rule', rule: 'deny' })
  expect(decide([deny], 'trusted', asked('bot', { effect: 'read' }, 'web_fetch'))).toEqual({ verdict: 'allow', by: 'default' })
})

test('a call that asks every time asks in any mode and past allow rules, and a deny rule still denies it', () => {
  const run = asked('bot', { effect: 'run', ask: true }, 'shell')
  const allow = rule({ verdict: 'allow', tool: 'shell' })
  const deny = rule({ verdict: 'deny', effect: 'run' })

  expect(decide([], 'trusted', asked('bot', { effect: 'read', ask: true }))).toEqual({ verdict: 'ask', by: 'default' })
  expect(decide([allow], 'trusted', run)).toEqual({ verdict: 'ask', by: 'default' })
  expect(decide([allow, deny], 'careful', run)).toEqual({ verdict: 'deny', by: 'rule', rule: 'deny' })
})

test('a rule matches only its own owner, conversation, tool and effect', () => {
  const allow = rule({ verdict: 'allow', conversation: 'c1', tool: 'mail', effect: 'send' })

  expect(decide([allow], 'trusted', asked('bot', { effect: 'send' }, 'mail', 'c2')).by).toBe('default')
  expect(decide([allow], 'trusted', asked('bot', { effect: 'spend' }, 'mail')).by).toBe('default')
  expect(decide([allow], 'trusted', asked('bot', { effect: 'send' }, 'chat')).by).toBe('default')
  expect(decide([allow], 'trusted', asked('thread', { effect: 'send' }, 'mail')).by).toBe('default')
  expect(decide([allow], 'trusted', asked('bot', { effect: 'send' }, 'mail')).by).toBe('rule')
})
