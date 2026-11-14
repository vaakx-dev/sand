import { contextLink, type Message, searchableText } from '@sand/chats/contract'
import { expect, test } from 'bun:test'

test('a reply is searched as the text the page shows, block by block, without Markdown, tool calls or thinking', () => {
  const reply: Message = {
    role: 'assistant',
    content: [
      { type: 'thinking', thinking: 'secret plans' },
      {
        type: 'text',
        text: [
          '## Release *notes*',
          '> Quoted **bold** and __strong__ words',
          '- [x] Read the [guide](https://example.com/guide) and ![the chart](chart.png)',
          '1. Run `bun test` in snake_case_folder',
          '| Name | Size |',
          '| --- | ---: |',
          '| tiles | 3 |',
          '```ts',
          'const **kept** = 1',
          '```',
          '---',
          'Mail <https://sand.dev> about ~~old~~ 2 * 3 * 4',
        ].join('\n'),
      },
      { type: 'tool_call', id: 'call', name: 'shell', input: { command: 'ls' } },
      { type: 'text', text: '  ' },
      { type: 'text', text: 'Done.' },
    ],
  }
  expect(searchableText(reply)).toEqual([
    {
      block: 1,
      text: [
        'Release notes',
        'Quoted bold and strong words',
        'Read the guide and the chart',
        'Run bun test in snake_case_folder',
        'Name Size',
        '',
        'tiles 3',
        '',
        'const **kept** = 1',
        '',
        '',
        'Mail https://sand.dev about old 2 * 3 * 4',
      ].join('\n'),
    },
    { block: 4, text: 'Done.' },
  ])
})

test('a user message is searched as what they typed, with link labels and quotes, and without context, tool results or feedback', () => {
  const link = contextLink({ kind: 'file', id: 'notes', label: 'notes.md' })
  const typed: Message = {
    role: 'user',
    content: [
      { type: 'context', records: [{ v: 1, id: 'notes', kind: 'file', label: 'notes.md', data: {} }] },
      { type: 'text', text: `> the old **plan**\nCompare ${link} with it` },
    ],
  }
  const results: Message = { role: 'user', content: [{ type: 'tool_result', callId: 'call', content: [{ type: 'text', text: 'file listing' }] }] }
  expect(searchableText(typed)).toEqual([{ block: 0, text: 'the old **plan**\nCompare notes.md with it' }])
  expect(searchableText(results)).toEqual([])
})
