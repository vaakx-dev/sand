import { startSand, type Sand } from '@sand/harness'
import { afterEach, expect, test } from 'bun:test'

const said = (text: string) => [{ type: 'text', text }] as const
const refused = [{ type: 'status', status: 400, error: 'invalid_request_error' }] as const

let sand: Sand

afterEach(() => sand.stop())

test('a PDF the provider refuses is left out, so its turn finishes and the thread keeps working', async () => {
  sand = await startSand([{ id: 'fake', api: 'anthropic', models: ['m'], replies: [[...refused], [...said('I could not read that PDF.')], [...said('Hello again.')]] }])
  const chat = sand.chat('fake/m')
  const broken = new TextEncoder().encode('%PDF-1.7\nnot really a pdf body')
  const stored = sand.media.put(broken, 'application/pdf')

  const first = await sand.turns.run(chat, [{ type: 'document', ...stored, mediaType: 'application/pdf', name: 'quote.pdf' }, { type: 'text', text: 'Check this quote' }])
  const second = await sand.turns.run(chat, 'hello')

  expect(first).toMatchObject({ text: 'I could not read that PDF.' })
  expect(second).toMatchObject({ text: 'Hello again.' })
  const [, retried, later] = sand.requests('fake')
  for (const body of [retried, later]) {
    expect(body).not.toContain(Buffer.from(broken).toString('base64'))
    expect(body).toContain('document unavailable: quote.pdf')
  }
})
