import type { FailedPlugin, HostStatus, RuntimeActivity, RuntimeReason, WireEvent } from '@sand/protocol'

export type RuntimeState = 'ready' | 'draining'

export interface RuntimeView {
  readonly id: string
  readonly pid: number
  readonly url: string
  readonly secret: string
  readonly state: RuntimeState
  readonly activity: RuntimeActivity
  readonly failed: readonly FailedPlugin[]
}

export interface Runtimes {
  current(): RuntimeView | undefined
  live(): RuntimeView[]
  wait(timeout: number): Promise<RuntimeView | undefined>
  swap(reason: RuntimeReason): Promise<boolean>
  status(): HostStatus
}

declare module 'drydock' {
  interface Services {
    runtimes: Runtimes
  }

  interface Events {
    'host.runtimes': () => void
    'host.event': (event: WireEvent) => void
  }
}
