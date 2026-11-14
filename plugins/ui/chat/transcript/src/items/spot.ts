import type { Entry, Message } from '@sand/chats/contract'
import type { Item } from '../contract'

export interface ItemSpot {
  item: Item
  key: string
  folds: string[]
}

const replyOf = (entry: Entry) => {
  const message = entry.type === 'message' ? (entry.data as Message) : undefined
  return message?.role === 'assistant' ? message : undefined
}

const keysOf = (entry: Entry, block?: number) => {
  const reply = replyOf(entry)
  if (!reply) return [entry.id]
  const blocks = block === undefined ? reply.content.map((_, index) => index) : [block]
  return blocks.map(index => `${entry.parent}:${index}`)
}

const spotIn = (item: Item, key: string): ItemSpot | undefined => {
  if (item.key === key && item.kind === 'thinking') return { item, key, folds: [key] }
  if (item.key === key && item.kind === 'user') return { item, key, folds: [`user:${key}`] }
  if (item.key === key) return { item, key, folds: [] }
  const step = item.kind === 'tools' && item.steps.some(step => step.key === key)
  return step ? { item, key, folds: [key] } : undefined
}

const firstOf = <T, R>(list: T[], pick: (value: T) => R | undefined) => {
  for (const value of list) {
    const found = pick(value)
    if (found) return found
  }
  return undefined
}

export const itemSpot = (items: Item[], entry: Entry, block?: number) => firstOf(keysOf(entry, block), key => firstOf(items, item => spotIn(item, key)))

export const itemNode = (root: ParentNode, key: string) => root.querySelector<HTMLElement>(`[data-item="${CSS.escape(key)}"]`) ?? undefined
