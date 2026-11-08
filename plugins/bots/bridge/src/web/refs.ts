import { threadScheme } from '@sand/chat/contract'

const prefix = `${threadScheme}:`

export const threadRef = (thread: string) => `${prefix}${thread}`

export const threadOfRef = (ref: string) => (ref.startsWith(prefix) ? ref.slice(prefix.length) : undefined)
