import type { Conversation, Owner } from '@sand/engine/contract'
import { expect, test } from 'bun:test'
import { z } from 'zod'
import { createCatalog } from '../src/catalog/catalog'
import type { Choices } from '../src/catalog/choices'
import { type Need, needs } from '../src/contract'

const conversationOf = (owner: Owner): Conversation => ({
  id: owner,
  owner,
  cwd: '.',
  append() {
    throw new Error('the catalog does not write')
  },
  path: () => [],
  entries: () => [],
})

const choices: Choices = { get: () => undefined, set: async () => {} }

const call = (name: string) => ({ type: 'tool_call' as const, id: name, name, input: {} })

const startCatalog = () => {
  const catalog = createCatalog(choices, () => {})
  const tool = (name: string, needed: Need[]) => catalog.register({ name, description: name, needs: needed, input: z.object({}), run: () => name })
  tool('plain', [])
  tool('shell', ['pc'])
  tool('worktree', ['thread', 'pc'])
  return catalog
}

const names = (catalog: ReturnType<typeof startCatalog>, owner: Owner) => catalog.specs([], conversationOf(owner)).map(spec => spec.name)

test('a conversation gets only the tools whose needs its owner offers', async () => {
  const catalog = startCatalog()
  catalog.offer('thread', () => needs)
  const offered: Need[] = []
  catalog.offer('bot', () => offered)

  expect(names(catalog, 'thread')).toEqual(['plain', 'shell', 'worktree'])
  expect(names(catalog, 'bot')).toEqual(['plain'])
  offered.push('pc')
  expect(names(catalog, 'bot')).toEqual(['plain', 'shell'])
})

test('a tool whose needs nobody offers cannot be run by name', async () => {
  const catalog = startCatalog()
  const context = { cwd: '.', signal: new AbortController().signal, conversation: conversationOf('bot'), turn: 't', progress() {}, wait: () => () => {} }

  expect(await catalog.run(call('shell'), context)).toMatchObject({ isError: true, content: [{ text: 'Unknown tool: shell' }] })
  expect(await catalog.run(call('plain'), context)).toMatchObject({ content: [{ text: 'plain' }] })
})
