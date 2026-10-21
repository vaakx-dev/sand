import type { Entry, UserPart } from '@sand/chats/contract'
import type { Item } from '../contract'

const tagOf = (text: string) => /^<([a-z][\w-]*)>[\s\S]*<\/\1>$/.exec(text.trim())?.[1]

const claimed = (part: UserPart, custom: (type: string) => boolean) => {
  const tag = part.kind === 'text' ? tagOf(part.text) : undefined
  return tag && custom(tag) ? tag : undefined
}

export const untagged = (parts: UserPart[], custom: (type: string) => boolean) => parts.filter(part => !claimed(part, custom))

export const taggedItems = (entry: Entry, parts: UserPart[], custom: (type: string) => boolean): Item[] =>
  parts.flatMap((part, index) => {
    const type = claimed(part, custom)
    if (!type || part.kind !== 'text') return []
    const id = `${entry.id}:t${index}`
    return [{ kind: 'custom', key: id, entry: { ...entry, id, type, data: part.text } }]
  })
