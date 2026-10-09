import type { ServerInfo, ServerMessage, WireRequest } from '@sand/protocol'
import { requestTicket, ticketSocketUrl } from '@sand/kit'

const openSocket = async (url: string, key: string) => {
  const ticket = await requestTicket(url, key)
  if (!ticket) throw new Error('sand refused this key')
  return new WebSocket(ticketSocketUrl(url, ticket.ticket))
}

export const ask = async <T>({ url, key }: Pick<ServerInfo, 'url' | 'key'>, request: WireRequest, timeout = 15_000) => {
  const socket = await openSocket(url, key)
  return new Promise<T>((resolve, reject) => {
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
}
