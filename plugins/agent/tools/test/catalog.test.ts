import type { Conversation } from '@sand/engine/contract'
import { expect, test } from 'bun:test'
import { z } from 'zod'
import { createCatalog } from '../src/catalog/catalog'
import { findName } from '../src/catalog/find'
import type { Choices } from '../src/catalog/choices'
import type { ToolLoad } from '../src/contract'

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
