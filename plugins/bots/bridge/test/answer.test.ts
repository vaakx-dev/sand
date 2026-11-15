import type { Entry } from '@sand/chats/contract'
import type { Thread } from '@sand/web-client/contract'
import { expect, test } from 'bun:test'
import { answerOf } from '../src/web/answer'

const said = (turn: string, role: 'user' | 'assistant', text: string, seq: number): Entry => ({
  id: `${turn}-${seq}`,
  session: 'bot',
  parent: null,
  at: seq,
  seq,
  turn,
  type: 'message',
  data: { role, content: [{ type: 'text', text }] },
})

const chat = (state: Partial<Thread>) => ({ turn: false, pending: [], ...state }) as Thread

const asked = said('t1', 'user', 'Is CI green?', 1)
const answered = said('t1', 'assistant', 'Yes, all green.', 2)

test("a bot's answer to a mention follows its turn: waiting, working, then the reply", () => {
  expect(answerOf(chat({ turn: true }), [], { turn: 't1', older: false })).toEqual({ kind: 'note', text: 'Waiting its turn' })
  expect(answerOf(chat({ turn: true }), [asked], { turn: 't1', older: false })).toEqual({ kind: 'working' })
  expect(answerOf(chat({}), [asked, answered], { turn: 't1', older: false })).toEqual({ kind: 'reply', text: 'Yes, all green.' })
})

test('a later turn running does not hide the reply, and a stopped turn says so', () => {
  const later = said('t2', 'user', 'And the docs?', 3)
  expect(answerOf(chat({ turn: true }), [asked, answered, later], { turn: 't1', older: false })).toEqual({ kind: 'reply', text: 'Yes, all green.' })

  const stopped: Entry = { ...asked, id: 'end', seq: 2, type: 'turn-ending', data: { stopReason: 'interrupted' } }
  expect(answerOf(chat({}), [asked, stopped], { turn: 't1', older: false })).toEqual({ kind: 'note', text: 'Stopped' })
})

test('an answer not in the loaded part of the chat is looked for further back', () => {
  expect(answerOf(chat({}), [], { turn: 't1', older: true })).toEqual({ kind: 'looking' })
  expect(answerOf(chat({}), [], { turn: 't1', older: false })).toEqual({ kind: 'note', text: 'No reply' })
})
