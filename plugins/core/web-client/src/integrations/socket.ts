import type { ClientMessage, Request, ServerMessage } from '@sand/host-hub/contract'

export type Call = <I, O>(request: Request<I, O>, input: I) => Promise<O>

export interface Heard {
  name: string
  payload: unknown
}

export interface Connection {
  call: Call
  close(): void
  heardAt(): number
  idle(): boolean
}

interface Handlers {
  event(heard: Heard): void
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

    const call: Call = <I, O>(request: Request<I, O>, input: I) =>
      new Promise<O>((resolveCall, rejectCall) => {
        if (socket.readyState !== WebSocket.OPEN) return rejectCall(new Error('Not connected to the sand server'))
        const id = ++next
        pending.set(id, { resolve: resolveCall as (value: unknown) => void, reject: rejectCall })
        socket.send(JSON.stringify({ type: request.id, id, input } satisfies ClientMessage))
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
      if (message.type === 'event') return handlers.event({ name: message.name, payload: message.payload })
      const waiting = pending.get(message.id)
      pending.delete(message.id)
      if (message.error !== undefined) waiting?.reject(new Error(message.error))
      else waiting?.resolve(message.result)
    }
    socket.onclose = () => {
      abandon()
      if (opened) handlers.close()
      else reject(new Error("Couldn't connect to the sand server"))
    }
  })
