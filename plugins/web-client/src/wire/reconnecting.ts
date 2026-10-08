import type { Hello, WireEvent, WireState } from '@sand/protocol'
import { onTimeout } from '@sand/dom'
import { connect, type Call, type Connection } from './connection'

export interface ReconnectOptions {
  url: string
  offline: string
  backoff(failures: number): number
  event(event: WireEvent): void
  hello(hello: Hello): void
  state(state: WireState): void
}

export interface Reconnecting {
  state(): WireState
  retryAt(): number | undefined
  call: Call
  reconnect(): void
  close(): void
}

export const backoff = (first: number, last: number) => (failures: number) => Math.min(first * 2 ** failures, last)

export const reconnecting = (options: ReconnectOptions): Reconnecting => {
  let connection: Connection | undefined
  let state: WireState = 'connecting'
  let attempt = 0
  let failures = 0
  let retryAt: number | undefined
  let cancelRetry: (() => void) | undefined
  let closed = false

  const set = (next: WireState) => {
    state = next
    options.state(next)
  }

  const retry = (from: number) => {
    if (closed || from !== attempt) return
    attempt++
    connection?.close()
    connection = undefined
    const delay = options.backoff(failures++)
    retryAt = Date.now() + delay
    set('closed')
    cancelRetry = onTimeout(() => void open(), delay)
  }

  const open = async () => {
    const current = ++attempt
    cancelRetry = undefined
    retryAt = undefined
    try {
      const opened = await connect(options.url, { event: options.event, close: () => retry(current) })
      if (closed || current !== attempt) return opened.close()
      connection = opened
      const hello = await opened.call<Hello>({ type: 'hello' })
      if (current !== attempt) return
      failures = 0
      options.hello(hello)
      set('open')
    } catch {
      retry(current)
    }
  }

  void open()

  return {
    state: () => state,
    retryAt: () => retryAt,
    call: request => (connection ? connection.call(request) : Promise.reject(new Error(options.offline))),
    reconnect() {
      if (!cancelRetry) return
      cancelRetry()
      void open()
    },
    close() {
      closed = true
      attempt++
      cancelRetry?.()
      cancelRetry = undefined
      connection?.close()
      connection = undefined
    },
  }
}
