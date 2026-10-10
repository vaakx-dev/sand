import type { LiveBlock } from '@sand/llm-accounts/contract'

export interface LiveSnapshot {
  live: LiveBlock[]
  tools: string[]
}

declare module '@sand/protocol/wire' {
  interface WireEvents {
    'live.snapshot': [session: string, snapshot: LiveSnapshot]
  }
}
