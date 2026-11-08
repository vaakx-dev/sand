import { startSand, type Sand } from '@sand/harness'
import { tools } from '@sand/tools/contract'
import { afterEach, expect, test } from 'bun:test'
import { join } from 'node:path'
import { htmlPage, type HtmlRenderEntry } from '../src/contract'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

const dot = Uint8Array.fromBase64('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==')

type Body = { messages: { content: { type: string; is_error?: boolean; content?: unknown }[] }[] }

const resultOf = (body: string) =>
  (JSON.parse(body) as Body).messages.flatMap(message => message.content).find(block => block.type === 'tool_result')

const call = async (name: string, input: Record<string, unknown>, files: Record<string, string | Uint8Array> = {}) => {
  sand = await startSand([{ id: 'fake', api: 'anthropic', models: ['m'], replies: [[{ type: 'call', name, input }], [said('Done.')]] }], {
    plugins: ['ui/chat/html'],
  })
  await Promise.all(Object.entries(files).map(([file, content]) => Bun.write(join(sand.home, file), content)))
  await sand.app.get(tools)!.choose('html', 'always')
  const chat = sand.chat('fake/m')
  await sand.turns.run(chat, 'Show me the chart')
  const entry = chat.path().find(entry => entry.type === 'html-render')?.data as HtmlRenderEntry | undefined
  const shown = entry && (await sand.ask(htmlPage, { session: chat.id, render: entry.id }))
  return { result: resultOf(sand.requests('fake')[1]!), shown }
}

test('html_render shows a page passed as markup', async () => {
  const { result, shown } = await call('html_render', { html: '<p>Sales rose</p>', title: 'Chart' })

  expect(result?.is_error).toBeFalsy()
  expect(shown).toContain('<p>Sales rose</p>')
})

test('html_render shows the file when html is its path', async () => {
  const { result, shown } = await call('html_render', { html: 'chart.html', title: 'Chart' }, { 'chart.html': '<p>Sales rose</p>' })

  expect(result?.is_error).toBeFalsy()
  expect(shown).toContain('<p>Sales rose</p>')
})

test.each(['html', 'path'])('html_render shows an image passed as %s', async field => {
  const { result, shown } = await call('html_render', { [field]: 'dot.png', title: 'Dot' }, { 'dot.png': dot })

  expect(result?.is_error).toBeFalsy()
  expect(shown).toContain(`<img src="data:image/png;base64,${dot.toBase64()}"`)
})

test.each(['html_render', 'html_preview'])('%s turns down html that is neither markup nor a file', async name => {
  const { result, shown } = await call(name, { html: 'pages/chart.html', title: 'Chart' })

  expect(result).toMatchObject({ is_error: true })
  expect(JSON.stringify(result?.content)).toContain('is neither')
  expect(shown).toBeUndefined()
})
