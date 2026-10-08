import type { Hello, WireRequest } from '../wire'

export type WireState = 'connecting' | 'open' | 'closed'

export interface Wire {
  readonly token: string
  state(): WireState
  retryAt(): number | undefined
  reconnect(): void
  hello(): Hello | undefined
  call<T = unknown>(request: WireRequest, device?: string): Promise<T>
}
