import type { Conversation } from '@sand/engine/contract'
import { expect, test } from 'bun:test'
import { z } from 'zod'
import { createCatalog } from '../src/catalog/catalog'
import type { Choices } from '../src/catalog/choices'
import { findName, type ToolLoad } from '../src/contract'

const conversation: Conversation = {
  id: 'c',
  owner: 'thread',
  cwd: '.',
  append() {
    throw new Error('the catalog does not write')
  },
  path: () => [],
  entries: () => [],
}

const memoryChoices = (): Choices => {
  const saved = new Map<string, ToolLoad>()
  return { get: group => saved.get(group), set: async (group, load) => void saved.set(group, load) }
}

const context = { cwd: '.', signal: new AbortController().signal, conversation, turn: 't', progress() {}, wait: () => () => {} }

const call = (name: string) => ({ type: 'tool_call' as const, id: name, name, input: {} })

const startCatalog = () => {
  const ran: string[] = []
  const catalog = createCatalog(memoryChoices(), () => {})
  catalog.group({ name: 'risky', label: 'Risky', summary: 'risky tools', load: 'off' })
  catalog.register({
    name: 'risky_act',
    group: 'risky',
    description: 'acts',
    environment: 'risky note',
    input: z.object({}),
    run() {
      ran.push('risky_act')
      return 'acted'
    },
  })
  return { catalog, ran }
}

test('a tool in a group that is off cannot be listed, noted, found or run, even by name', async () => {
  const { catalog, ran } = startCatalog()
  expect(catalog.specs([], conversation).map(spec => spec.name)).toEqual([])
  expect(catalog.notes(conversation)).toEqual([])
  expect(await catalog.run(call('risky_act'), context)).toMatchObject({ isError: true, content: [{ text: 'Unknown tool: risky_act' }] })
  expect(ran).toEqual([])
})

test('turning the group on lets the tool run', async () => {
  const { catalog, ran } = startCatalog()
  await catalog.choose('risky', 'on-demand')
  expect(await catalog.run(call('risky_act'), context)).toMatchObject({ content: [{ text: 'acted' }] })
  expect(catalog.notes(conversation)).toEqual(['risky note'])
  await catalog.choose('risky', 'off')
  expect(await catalog.run(call('risky_act'), context)).toMatchObject({ isError: true })
  expect(ran).toEqual(['risky_act'])
})

test('a gate sees what a call does and its refusal stops the call', async () => {
  const { catalog, ran } = startCatalog()
  await catalog.choose('risky', 'always')
  const acts: unknown[] = []
  const ungate = catalog.gate(async act => {
    acts.push(act)
    return 'Not run: denied'
  })
  expect(await catalog.run(call('risky_act'), context)).toMatchObject({ isError: true, content: [{ text: 'Not run: denied' }] })
  expect(acts).toEqual([{ effect: 'run' }])
  ungate()
  expect(await catalog.run(call('risky_act'), context)).toMatchObject({ content: [{ text: 'acted' }] })
  expect(ran).toEqual(['risky_act'])
})

const named = (name: string, replaces?: string[]) => ({ name, description: name, input: z.object({}), ...(replaces && { replaces }), run: () => name })

test('a second tool under a taken name fails to register, naming where both came from', () => {
  const { catalog } = startCatalog()
  expect(() => catalog.register(named('risky_act'))).toThrow(/Tool "risky_act" from .*catalog\.test\.ts.* clashes with the one from .*catalog\.test\.ts/)
  expect(() => catalog.register(named(findName))).toThrow('takes the name of the built-in tool search')
})

test('a tool takes a name again once the first is gone, or when one of them replaces the other', async () => {
  const catalog = createCatalog(memoryChoices(), () => {})
  catalog.register(named('look'))()
  catalog.register(named('look'))
  catalog.register(named('look', ['look']))
  expect(catalog.specs([], conversation).map(spec => spec.name)).toEqual(['look'])
  expect(await catalog.run(call('look'), context)).toMatchObject({ content: [{ text: 'look' }] })
})

test('a tool can stay loaded for some owners while others find it in its group', () => {
  const catalog = createCatalog(memoryChoices(), () => {})
  catalog.group({ name: 'notes', label: 'Notes', summary: 'note tools', load: 'off' })
  catalog.register({ ...named('note_edit'), group: 'notes', always: ['bot'] })
  expect(catalog.specs([], { ...conversation, owner: 'bot' }).map(spec => spec.name)).toEqual(['note_edit'])
  expect(catalog.specs([], conversation)).toEqual([])
})

test('a restriction keeps a tool from being listed or run', async () => {
  const catalog = createCatalog(memoryChoices(), () => {})
  for (const name of ['look', 'other']) catalog.register(named(name))
  catalog.restrict(tool => tool === 'look')
  expect(catalog.specs([], conversation).map(spec => spec.name)).toEqual(['look'])
  expect(await catalog.run(call('other'), context)).toMatchObject({ isError: true, content: [{ text: 'Unknown tool: other' }] })
  expect(await catalog.run(call('look'), context)).toMatchObject({ content: [{ text: 'look' }] })
})

test('a restriction sees the effect of a tool that has one, and refuses a call whose effect it does not allow', async () => {
  const catalog = createCatalog(memoryChoices(), () => {})
  catalog.register({ ...named('fixed'), effect: 'write' })
  catalog.register({ ...named('either'), input: z.object({ changes: z.boolean() }), act: ({ changes }) => ({ effect: changes ? 'write' : 'read' }) })
  const seen: unknown[] = []
  catalog.restrict((tool, _, act) => (seen.push([tool, act]), !act || act.effect === 'read'))
  expect(catalog.specs([], conversation).map(spec => spec.name)).toEqual(['either'])
  expect(seen).toEqual([
    ['fixed', { effect: 'write' }],
    ['either', undefined],
  ])
  const either = (changes: boolean) => ({ type: 'tool_call' as const, id: 'e', name: 'either', input: { changes } })
  expect(await catalog.run(either(false), context)).toMatchObject({ content: [{ text: 'either' }] })
  expect(await catalog.run(either(true), context)).toMatchObject({ isError: true, content: [{ text: expect.stringContaining("either isn't available to this agent for this call") }] })
})

test('the tool search offers only what the chat may use, says when a named tool is not, and tells loaded tools apart', async () => {
  const catalog = createCatalog(memoryChoices(), () => {})
  catalog.group({ name: 'notes', label: 'Notes', summary: 'note tools', load: 'on-demand' })
  for (const name of ['note_read', 'note_write']) catalog.register({ ...named(name), group: 'notes' })
  catalog.restrict(tool => tool !== 'note_write')
  const find = (query: string) => ({ type: 'tool_call' as const, id: query, name: findName, input: { query } })
  const texts = async (query: string) => (await catalog.run(find(query), context)).content.flatMap(item => (item.type === 'text' ? [item.text] : []))
  const loadedBefore = { role: 'user' as const, content: [{ type: 'tool_result' as const, callId: 'x', content: [{ type: 'tool_reference' as const, name: 'note_read' }] }] }

  expect(catalog.specs([], conversation).find(spec => spec.name === findName)?.description).toEndWith('- notes: note tools (note_read)')
  expect(await texts('note_write')).toEqual(["note_write isn't available in this chat."])
  expect(await texts('notes')).toEqual(['Loaded: note_read'])
  catalog.specs([loadedBefore], conversation)
  expect(await texts('notes')).toEqual(['Already loaded: note_read'])
})

test('a relay skips the gate, since each call it makes is checked on its own', async () => {
  const catalog = createCatalog(memoryChoices(), () => {})
  catalog.register({ ...named('relay'), relay: true })
  catalog.register(named('look'))
  catalog.gate(async () => 'Not run: denied')
  expect(await catalog.run(call('relay'), context)).toMatchObject({ content: [{ text: 'relay' }] })
  expect(await catalog.run(call('look'), context)).toMatchObject({ isError: true, content: [{ text: 'Not run: denied' }] })
})
