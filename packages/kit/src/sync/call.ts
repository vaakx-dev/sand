import type { WireRequest } from '@sand/protocol'

export type SyncCall = <T = unknown>(request: WireRequest, device?: string) => Promise<T>
