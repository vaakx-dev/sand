export interface Notice {
  text: string
}

declare module '@sand/protocol/wire' {
  interface WireRequests {
    'secret.answer': { session: string; call: string; value: string | null }
  }
}
