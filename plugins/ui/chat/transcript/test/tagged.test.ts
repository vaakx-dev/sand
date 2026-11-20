import { expect, test } from 'bun:test'
import { type Entry, notificationTag, notificationText, userParts } from '@sand/chats/contract'
import { userItems } from '../src/items/settled'

const notice = notificationText({ from: 'thread', id: 't1', kind: 'thread', label: 'Check the notes', status: 'asks', at: 0, result: 'Cover the beta?' })

const shown = (text: string) => {
  const entry: Entry = { id: 'u1', session: 's', parent: null, at: 0, type: 'message', data: null, seq: 1 }
  return userItems(entry, userParts({ role: 'user', content: [{ type: 'text', text }] }), false, type => type === notificationTag).map(item => item.kind)
}

test('a notice with instructions after its closing tag shows as a notice row, not a message', () => {
  expect(shown(`${notice}\nReply with answer_agent.`)).toEqual(['custom'])
})

test('a message that only mentions a notice tag stays a message', () => {
  expect(shown(`Why does ${notice} show up?`)).toEqual(['user'])
})
