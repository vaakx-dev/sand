import type { UserContent } from '@sand/messages'

export interface StashOrigin {
  cwd: string
  device?: string
  thread?: string
  title?: string
}

export interface Stashed {
  id: string
  label: string
  text: string
  content: UserContent[]
  from?: StashOrigin
  at: number
}

export interface StashRequest {
  text: string
  content: UserContent[]
  from?: StashOrigin
  item?: string
  at?: number
}

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'stash.list': {}
    'stash.save': StashRequest
    'stash.remove': { item: string }
  }

  interface WireEvents {
    'stash.change': []
  }
}
