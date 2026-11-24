import { expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Notice } from '../src/contract'
import { Inbox } from '../src/host/inbox'

const phone = 'phone-1'
const token = 'token-hash'

const notice = (tag: string, title: string): Notice => ({ title, body: `Finished: ${title}`, tag, pc: 'pc-1', thread: `thread-${tag}` })

const eventsIn = (text: string) =>
  text
    .split('\n\n')
    .map(block => block.split('\n').find(line => line.startsWith('data: ')))
    .flatMap(line => (line ? [JSON.parse(line.slice('data: '.length)) as Notice] : []))

const reading = (response: Response) => {
  if (!response.body) throw new Error('The inbox answered without a stream')
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
  let text = ''
  const until = async (count: number) => {
    while (eventsIn(text).length < count) {
      const { value, done } = await reader.read()
      if (done) break
      text += value
    }
    return eventsIn(text)
  }
  const ended = async () => {
    while (!(await reader.read()).done) {}
  }
  return { until, ended, stop: () => reader.cancel() }
}

test('a notice waits for the app, comes again until the app says it saw it, and outlives a restart', async () => {
  const home = mkdtempSync(join(tmpdir(), 'sand-inbox-'))
  try {
    const inbox = await Inbox.load(home)
    await inbox.post(phone, notice('a', 'Tidy the garden'))

    const first = reading(await inbox.open({ device: phone, token }))
    expect((await first.until(1)).map(found => found.tag)).toEqual(['a'])
    await inbox.post(phone, notice('b', 'Water the roses'))
    expect((await first.until(2)).map(found => found.title)).toEqual(['Tidy the garden', 'Water the roses'])
    await first.stop()

    const restarted = await Inbox.load(home)
    await restarted.post(phone, notice('c', 'Sweep the path'))
    const again = reading(await restarted.open({ device: phone, token, seen: 'a' }))
    expect((await again.until(2)).map(found => found.tag)).toEqual(['b', 'c'])
    await again.stop()

    const caughtUp = reading(await restarted.open({ device: phone, token, seen: 'c' }))
    await restarted.post(phone, notice('d', 'Feed the cat'))
    expect((await caughtUp.until(1)).map(found => found.tag)).toEqual(['d'])
    await caughtUp.stop()
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})

test('turning notifications off ends the stream and drops what was waiting', async () => {
  const home = mkdtempSync(join(tmpdir(), 'sand-inbox-'))
  try {
    const inbox = await Inbox.load(home)
    const open = reading(await inbox.open({ device: phone, token }))
    await inbox.post(phone, notice('a', 'Tidy the garden'))
    await open.until(1)

    await inbox.keep(() => undefined)
    await open.ended()

    const back = reading(await inbox.open({ device: phone, token }))
    await inbox.post(phone, notice('c', 'Sweep the path'))
    expect((await back.until(1)).map(found => found.tag)).toEqual(['c'])
    await back.stop()
  } finally {
    rmSync(home, { recursive: true, force: true })
  }
})
