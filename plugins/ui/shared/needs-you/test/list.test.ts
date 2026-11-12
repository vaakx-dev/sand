import { describe, expect, test } from 'bun:test'
import { createList } from '../src/list'
import type { Need } from '../src/contract'

const need = (id: string, at: number, kind: Need['kind'] = 'secret'): Need => ({
  id,
  kind,
  who: 'Wren',
  title: `Which ${id}?`,
  at,
  render: () => null,
})

describe('needs list', () => {
  test('oldest first across sources', () => {
    const host = createList()
    host.source({ id: 'a', items: () => [need('a1', 300), need('a2', 100)] })
    host.source({ id: 'b', items: () => [need('b1', 200)] })
    expect(host.list().map(item => item.id)).toEqual(['a2', 'b1', 'a1'])
  })

  test('settling removes an item when its source stops listing it', () => {
    const host = createList()
    let waiting = [need('a1', 100)]
    host.source({ id: 'a', items: () => waiting })
    expect(host.list()).toHaveLength(1)
    waiting = []
    expect(host.list()).toEqual([])
  })

  test('disposing a source removes its needs', () => {
    const host = createList()
    const stop = host.source({ id: 'a', items: () => [need('a1', 100)] })
    expect(host.list()).toHaveLength(1)
    stop()
    expect(host.list()).toEqual([])
  })
})
