import type { Entry, Message, Session } from '@sand/chats/contract'
import { startSand, type Sand } from '@sand/harness'
import { afterEach, beforeEach, expect, test } from 'bun:test'

let sand: Sand
let chat: Session

beforeEach(async () => {
  sand = await startSand([])
  chat = sand.sessions.thread(sand.home)
})

afterEach(() => sand.stop())

const said = (role: Message['role'], text: string): Message => ({ role, content: [{ type: 'text', text }] })

const ids = (entries: Entry[]) => entries.map(entry => entry.id)

const turn = (n: number) => [
  chat.append('message', said('user', `ask ${n}`)),
  chat.append('message', { role: 'assistant', content: [{ type: 'tool_call', id: `call-${n}`, name: 'read', input: {} }] }),
  chat.append('message', { role: 'user', content: [{ type: 'tool_result', callId: `call-${n}`, content: [{ type: 'text', text: 'file' }] }] }),
  chat.append('message', said('assistant', `answer ${n}`)),
]

test('checking out an earlier entry starts a branch and keeps the old one', () => {
  const ask = chat.append('message', said('user', 'hi'))
  chat.append('settings', { model: 'a/one' })
  const first = chat.append('message', said('assistant', 'first'))

  chat.checkout(ask.id)
  const second = chat.append('message', said('assistant', 'second'))

  expect(chat.messages()).toEqual([said('user', 'hi'), said('assistant', 'second')])
  expect(chat.latest('settings')).toBeUndefined()
  expect(ids(chat.entries())).toContain(first.id)

  chat.checkout(first.id)
  expect(chat.messages()).toEqual([said('user', 'hi'), said('assistant', 'first')])
  expect(chat.latest('settings')?.data).toEqual({ model: 'a/one' })
  expect(ids(chat.path())).not.toContain(second.id)
})

test('a message branches into the other messages sent from the same point, each at its newest entry', () => {
  chat.append('message', said('user', 'hi'))
  const answer = chat.append('message', said('assistant', 'hello'))
  const first = chat.append('message', said('user', 'first try'))
  const firstReply = chat.append('message', said('assistant', 'reply to first'))
  const followUp = chat.append('message', said('user', 'follow-up'))

  chat.checkout(answer.id)
  chat.append('settings', { model: 'a/two' })
  const second = chat.append('message', said('user', 'second try'))
  chat.append('message', said('assistant', 'reply to second'))
  chat.checkout(second.id)
  const retried = chat.append('message', said('assistant', 'retried reply'))

  chat.checkout(firstReply.id)
  const expected = [
    { entry: first.id, leaf: followUp.id },
    { entry: second.id, leaf: retried.id },
  ]
  expect(chat.branches(first.id)).toEqual(expected)
  expect(chat.branches(second.id)).toEqual(expected)
})

test('paging back from the head walks the whole path, one turn at a time', () => {
  const all = [...turn(1), ...turn(2), ...turn(3)]
  const pages: Entry[][] = []
  let page = chat.page(undefined, { entries: 2 })
  pages.push(page.entries)
  while (page.more) {
    page = chat.page(page.entries[0]?.id, { entries: 2 })
    pages.push(page.entries)
  }

  expect(ids(pages.toReversed().flat())).toEqual(ids(all))
  expect(pages.map(found => found[0]?.data)).toEqual([said('user', 'ask 3'), said('user', 'ask 2'), said('user', 'ask 1')])
})

test('catching up from a cursor returns what came after it, until the chat moves to another branch', () => {
  const [ask, , , answer] = turn(1)
  const later = turn(2)

  expect(ids(chat.since(answer!.id)!)).toEqual(ids(later))
  expect(ids(chat.since(answer!.seq)!)).toEqual(ids(later))

  chat.checkout(ask!.id)
  chat.append('message', said('assistant', 'another answer'))
  expect(chat.since(answer!.id)).toBeUndefined()
})
