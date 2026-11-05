import { expect, test } from 'bun:test'
import type { OutboxItem } from '../src/contract'
import type { Link } from '../src/outbox/link'
import { createOutbox, type OutboxSaved } from '../src/outbox/outbox'

const office = 'office'

const message = (id: string, at: number): OutboxItem => ({ id, session: 'chat', pc: office, prompt: id, label: id, at })

const officePc = (refuse = new Set<string>()) => {
  const pc = { online: false, sent: [] as string[] }
  const link: Link = {
    ready: () => pc.online,
    turnsApi: () => true,
    async send(_pc, input) {
      pc.sent.push(input.clientRequestId)
      if (refuse.delete(input.clientRequestId)) throw new Error('No chat with that id')
      return { disposition: 'started', turn: 'turn' }
    },
  }
  return { pc, link }
}

const outbox = (link: Link) => {
  const stored = new Map<string, OutboxItem>()
  const saved: OutboxSaved = {
    load: async () => ({ items: [], pcs: [] }),
    put: async item => void stored.set(item.id, item),
    remove: async id => void stored.delete(id),
    remember: async () => {},
  }
  return { stored, box: createOutbox({ link, saved, sent: () => {}, changed: () => {} }) }
}

test('messages for an offline PC wait and go out once each, oldest first, when it says hello', async () => {
  const { pc, link } = officePc()
  const { stored, box } = outbox(link)

  await box.submit(message('third', 3))
  await box.submit(message('first', 1))
  await box.submit(message('cancelled', 2))
  box.service.cancel('cancelled')

  expect(pc.sent).toEqual([])
  expect([...stored.keys()].sort()).toEqual(['first', 'third'])

  pc.online = true
  await Promise.all([box.greeted(office), box.greeted(office)])
  await box.greeted(office)

  expect(pc.sent).toEqual(['first', 'third'])
  expect(stored.size).toBe(0)
  expect(box.service.list(office)).toEqual([])
})

test('a refused message stays with its error without holding back the rest, and Send now resends it with the same id', async () => {
  const { pc, link } = officePc(new Set(['first']))
  const { stored, box } = outbox(link)

  await box.submit(message('first', 1))
  await box.submit(message('second', 2))
  pc.online = true
  await box.greeted(office)

  expect(pc.sent).toEqual(['first', 'second'])
  expect(box.service.list(office).map(item => [item.id, item.error])).toEqual([['first', 'No chat with that id']])
  expect(stored.get('first')?.error).toBe('No chat with that id')

  await box.service.send('first')

  expect(pc.sent).toEqual(['first', 'second', 'first'])
  expect(box.service.list(office)).toEqual([])
  expect(stored.size).toBe(0)
})
