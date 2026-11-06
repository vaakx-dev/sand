import { startSand, type Sand } from '@sand/harness'
import { media } from '@sand/media/contract'
import { tools } from '@sand/tools/contract'
import { afterEach, expect, test } from 'bun:test'
import { z } from 'zod'

let sand: Sand

afterEach(() => sand.stop())

const said = (text: string) => ({ type: 'text', text }) as const

const dot = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')

const tallPage = () => new Bun.Image(dot).resize(736, 3500, { fit: 'fill' }).png().bytes()

type Body = { messages: { content: { type: string; content?: { type: string; source?: { data: string } }[] }[] }[] }

const sentImage = (body: Body) => {
  const result = body.messages.flatMap(message => message.content).find(block => block.type === 'tool_result')
  const image = result?.content?.find(block => block.type === 'image')
  return new Bun.Image(Buffer.from(image!.source!.data, 'base64')).metadata()
}

test('a tool image too tall for the model is shrunk before the model sees it', async () => {
  sand = await startSand(
    [{ id: 'fake', api: 'anthropic', models: ['m'], replies: [[said('Looking.'), { type: 'call', name: 'screenshot', input: {} }], [said('Seen.')]] }],
    { plugins: ['core/transfers', 'agent/attachments'] },
  )
  const store = sand.app.get(media)!
  const png = await tallPage()
  sand.app.get(tools)!.register({
    name: 'screenshot',
    description: 'Take a screenshot',
    input: z.object({}),
    run: () => [{ type: 'image', name: 'page.png', ...store.put(png, 'image/png') }],
  })

  await sand.turns.run(sand.chat('fake/m'), 'Check the page')

  const [, second] = sand.requests('fake').map(body => JSON.parse(body) as Body)
  expect(await sentImage(second!)).toMatchObject({ width: 421, height: 2000 })
})
