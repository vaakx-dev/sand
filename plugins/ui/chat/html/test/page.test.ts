import { startSand, type Sand } from '@sand/harness'
import { tools } from '@sand/tools/contract'
import { afterEach, expect, test } from 'bun:test'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

type Body = { messages: { content: { type: string; is_error?: boolean; content?: unknown }[] }[] }

const resultOf = (body: string) =>
  (JSON.parse(body) as Body).messages.flatMap(message => message.content).find(block => block.type === 'tool_result')

const call = async (name: string, input: Record<string, unknown>) => {
  sand = await startSand([{ id: 'fake', api: 'anthropic', models: ['m'], replies: [[{ type: 'call', name, input }], [said('Done.')]] }], {
    plugins: ['ui/chat/html'],
  })
  await sand.app.get(tools)!.choose('html', 'always')
  const chat = sand.chat('fake/m')
  await sand.turns.run(chat, 'Show me the chart')
  return { chat, result: resultOf(sand.requests('fake')[1]!) }
}

test.each(['html_render', 'html_preview'])('%s turns down a file path passed as html and points to path instead', async name => {
  const { chat, result } = await call(name, { html: 'C:\\pages\\chart.html', title: 'Chart' })

  expect(result).toMatchObject({ is_error: true })
  expect(JSON.stringify(result?.content)).toContain('pass its path as path')
  expect(chat.path().some(entry => entry.type === 'html-render')).toBe(false)
})

test('html_render shows a page passed as markup', async () => {
  const { chat, result } = await call('html_render', { html: '<p>Sales rose</p>', title: 'Chart' })

  expect(result?.is_error).toBeFalsy()
  expect(chat.path().find(entry => entry.type === 'html-render')?.data).toMatchObject({ title: 'Chart' })
})
