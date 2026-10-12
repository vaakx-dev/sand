import type { ServerMessage, WireEvent, WireRequest } from '@sand/protocol'

export type Call = <T = unknown>(request: WireRequest) => Promise<T>

export interface Connection {
  call: Call
  close(): void
  heardAt(): number
  idle(): boolean
}

interface Handlers {
  event(event: WireEvent): void
  close(): void
}

export const connect = (url: string, handlers: Handlers) =>
  new Promise<Connection>((resolve, reject) => {
    const socket = new WebSocket(url)
    const pending = new Map<number, { resolve(value: unknown): void; reject(error: Error): void }>()
    let next = 0
    let opened = false
    let heardAt = Date.now()

    const abandon = () => {
      for (const waiting of pending.values()) waiting.reject(new Error('Disconnected from the sand server'))
      pending.clear()
    }

    const call: Call = request =>
      new Promise((resolveCall, rejectCall) => {
        if (socket.readyState !== WebSocket.OPEN) return rejectCall(new Error('Not connected to the sand server'))
        const id = ++next
        pending.set(id, { resolve: resolveCall as (value: unknown) => void, reject: rejectCall })
        socket.send(JSON.stringify({ ...request, id }))
      })

    const close = () => {
      socket.close()
      abandon()
    }

    socket.onopen = () => {
      opened = true
      heardAt = Date.now()
      resolve({ call, close, heardAt: () => heardAt, idle: () => pending.size === 0 })
    }
    socket.onmessage = event => {
      heardAt = Date.now()
      const message = JSON.parse(String(event.data)) as ServerMessage
      if (message.type === 'event') return handlers.event({ name: message.name, args: message.args } as WireEvent)
      const waiting = pending.get(message.id)
      pending.delete(message.id)
      if (message.error !== undefined) waiting?.reject(new Error(message.error))
      else waiting?.resolve(message.result)
    }
    socket.onclose = () => {
      abandon()
      if (opened) handlers.close()
      else reject(new Error('Could not connect to the sand server'))
    }
  })
