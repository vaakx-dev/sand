import { expect, test } from 'bun:test'
import { fitInside, parseKeys, type Action, type Computer } from '../src/contract'
import { createRegistry } from '../src/registry'

const fake = (id: string, touched = () => false) => {
  const done: Action[] = []
  const computer: Computer = {
    info: { id, kind: 'desktop', label: `PC ${id}`, os: 'windows' },
    screenshot: async () => ({ png: new Uint8Array(), width: 1, height: 1 }),
    elements: async () => [],
    act: async action => void done.push(action),
    humanInput: async () => touched(),
  }
  return { computer, done }
}

const wait: Action = { type: 'wait', ms: 0 }

test('computers register, list with who controls them, and unregister', () => {
  let changes = 0
  const registry = createRegistry(() => changes++)
  const remove = registry.register(fake('a').computer)
  expect(() => registry.register(fake('a').computer)).toThrow('already registered')
  expect(registry.list()).toEqual([{ id: 'a', kind: 'desktop', label: 'PC a', os: 'windows', control: 'agent' }])
  remove()
  expect(registry.list()).toEqual([])
  expect(changes).toBe(2)
})

test('a person who takes over a computer blocks the agent until they hand it back', async () => {
  const registry = createRegistry(() => {})
  const { computer, done } = fake('a')
  registry.register(computer)
  registry.control('a', 'human')
  await expect(registry.get('a')?.act(wait)).rejects.toThrow('The user has taken over PC a')
  expect(await registry.get('a')?.screenshot()).toMatchObject({ width: 1 })
  registry.control('a', 'agent')
  await registry.get('a')?.act(wait)
  expect(done).toEqual([wait])
})

test('input from a person since the last action hands the computer to them', async () => {
  let touched = false
  const registry = createRegistry(() => {})
  const { computer, done } = fake('a', () => touched)
  registry.register(computer)
  await registry.get('a')?.act(wait)
  touched = true
  await expect(registry.get('a')?.act(wait)).rejects.toThrow('taken over')
  expect(registry.list()[0]?.control).toBe('human')
  expect(done).toEqual([wait])
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
