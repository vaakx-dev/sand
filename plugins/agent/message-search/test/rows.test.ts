import { expect, test } from 'bun:test'
import type { Fit, MessageHit } from '../src/contract'
import { messageRows, type RowParts } from '../src/web/rows'
import type { PcChat } from '../src/web/search'

const hit = (text: string): MessageHit => ({ entry: text, block: 0, role: 'user', at: Date.now(), fit: 'phrase', excerpt: { text, marks: [] } })

const chat = (title: string, fit: Fit, weight: number, said: string[], matches = said.length): PcChat => ({
  pc: 'home',
  owner: 'thread',
  chat: title,
  title,
  at: Date.now(),
  fit,
  weight,
  matches,
  hits: said.map(hit),
})

test('message rows show each chat once with its best line, a second line under it and the rest a tap away; use only breaks near-ties', () => {
  const parts: RowParts = {
    used: visits => (visits === 'thread:favourite' ? 0.9 : 0),
    tint: () => undefined,
    open: () => {},
    more: found => ({ id: found.chat, title: found.title }),
  }
  const chats = [
    chat('prefix', 'prefixes', 9, ['prefix line']),
    chat('plain', 'phrase', 3, ['plain line']),
    chat('favourite', 'phrase', 2.9, ['favourite line']),
    chat('clear', 'phrase', 3.5, ['clear line']),
    chat('strong', 'phrase', 4, ['best line', 'second line'], 5),
  ]

  const rows = messageRows(parts, chats).map(row => [row.nested ? `  ${row.label}` : row.label, row.excerpt?.text ?? '', Boolean(row.page)])
  expect(rows).toEqual([
    ['strong', 'best line', false],
    ['  second line', 'second line', false],
    ['  3 more', '', true],
    ['clear', 'clear line', false],
    ['favourite', 'favourite line', false],
    ['plain', 'plain line', false],
    ['prefix', 'prefix line', false],
  ])
})
