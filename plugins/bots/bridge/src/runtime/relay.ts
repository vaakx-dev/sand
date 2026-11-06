import { type ContextRecord, contextLink, type UserContent } from '@sand/chats/contract'
import { uuid } from '@sand/util'

export interface Sender {
  kind: 'bot' | 'thread'
  id: string
  label: string
}

const recordOf = ({ kind, id, label }: Sender): ContextRecord => ({ v: 1, id: uuid(), kind, label, data: { id, sent: true } })

export const toBot = (sender: Sender, text: string): UserContent[] => [
  { type: 'text', text },
  { type: 'context', records: [recordOf(sender)] },
]

export const toThread = (sender: Sender, text: string): UserContent[] => {
  const record = recordOf(sender)
  return [
    { type: 'text', text: `${contextLink(record)} ${text}` },
    { type: 'context', records: [record] },
  ]
}
