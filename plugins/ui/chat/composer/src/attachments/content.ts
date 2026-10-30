import type { UserContent } from '@sand/chats/contract'

export const pasteLimit = 32 * 1024

export const pastedFile = (text: string) => new File([text], 'Pasted text.txt', { type: 'text/plain' })

export const contentName = (item: UserContent) => ('name' in item && item.name) || item.type

export const compose = (text: string, items: UserContent[]): UserContent[] => (text.trim() ? [...items, { type: 'text', text }] : items)
