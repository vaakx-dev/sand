import { expect, test } from 'bun:test'
import { fitInside, parseKeys, type Computer } from '../src/contract'
import { createRegistry } from '../src/registry'

const fake = (id: string): Computer => ({
  info: { id, kind: 'desktop', label: `PC ${id}`, os: 'windows' },
  screenshot: async () => ({ png: new Uint8Array(), width: 1, height: 1 }),
  elements: async () => [],
  act: async () => {},
})

test('computers register, list and unregister', () => {
  let changes = 0
  const registry = createRegistry(() => changes++)
  const remove = registry.register(fake('a'))
  expect(() => registry.register(fake('a'))).toThrow('already registered')
  expect(registry.list()).toEqual([{ id: 'a', kind: 'desktop', label: 'PC a', os: 'windows' }])
  remove()
  expect(registry.list()).toEqual([])
  expect(changes).toBe(2)
})

test('key combos parse into keys, and unknown names are refused', () => {
  expect(parseKeys('Ctrl + Shift+t').map(key => key.code)).toEqual(['ControlLeft', 'ShiftLeft', 'KeyT'])
  expect(parseKeys('cmd+esc').map(key => key.name)).toEqual(['meta', 'escape'])
  expect(() => parseKeys('ctrl+banana')).toThrow('Unknown key "banana"')
})

test('screenshots scale down to fit, keeping their shape, and never scale up', () => {
  expect(fitInside({ width: 4096, height: 2160 }, { width: 1568, height: 1568 })).toEqual({ width: 1568, height: 827 })
  expect(fitInside({ width: 800, height: 600 }, { width: 1568, height: 1568 })).toEqual({ width: 800, height: 600 })
  expect(fitInside({ width: 800, height: 600 }, undefined)).toEqual({ width: 800, height: 600 })
})
