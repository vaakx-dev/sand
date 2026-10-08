import type { ServerInfo, ServerMessage, WireRequest } from '@sand/protocol'
import { socketUrl } from '@sand/kit'

export const ask = <T>({ url, token }: Pick<ServerInfo, 'url' | 'token'>, request: WireRequest, timeout = 15_000) =>
  new Promise<T>((resolve, reject) => {
    const socket = new WebSocket(socketUrl(url, token))
    const timer = setTimeout(() => finish(new Error('sand did not answer')), timeout)
    const finish = (error?: Error, result?: T) => {
      clearTimeout(timer)
      socket.close()
      if (error) reject(error)
      else resolve(result as T)
    }
    socket.onopen = () => socket.send(JSON.stringify({ ...request, id: 1 }))
    socket.onerror = () => finish(new Error('could not reach sand'))
    socket.onmessage = event => {
      const message = JSON.parse(String(event.data)) as ServerMessage
      if (message.type !== 'result' || message.id !== 1) return
      if (message.error) finish(new Error(message.error))
      else finish(undefined, message.result as T)
    }
  })
