import { expect, test } from 'bun:test'
import type { MemorySpace, MemoryStore, Note } from '../src/contract'
import { memorySection, memorySectionLength } from '../src/prompt'

const space: MemorySpace = { name: 'bot', title: 'Your memory', about: 'Your memory loads into every conversation.', of: () => undefined, folder: () => '' }

const storeOf = (text: string, notes: Note[]): MemoryStore => ({
  read: async () => text,
  notes: async () => notes,
  write: async () => {},
  writeNote: async () => {},
})

const measured = async (text: string, notes: Note[]) => {
  const section = await memorySection(storeOf(text, notes), space, { space: 'bot', id: 'b' })
  const system = ['# Intro\n\nYou are a bot.', section, '## Your plan\n\nShip it.\n\nNotes:\n- not memory'].join('\n\n')
  return { section, length: memorySectionLength(system, space) }
}

test('measures the whole memory section in the system prompt, headings and notes included', async () => {
  const filled = await measured('## People\n\nAda likes tea.\n\nNotes:\n- a fake list', [
    { name: 'tea', text: '# Tea\nGreen' },
    { name: 'trips', text: 'Trips taken' },
  ])
  const empty = await measured('', [])
  expect(filled.length).toBe(filled.section.length)
  expect(empty.length).toBe(empty.section.length)
})

test('measures nothing when the system prompt has no memory section', () => {
  expect(memorySectionLength('# Intro\n\nYou are a bot.', space)).toBe(0)
})
