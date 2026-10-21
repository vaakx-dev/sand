import type { OrrinEnvelope, OrrinEvent } from '../contract'
import type { Daemon } from './find'

interface Listeners {
  event(event: OrrinEvent): void
  closed(): void
}

const eventsUrl = (daemon: Daemon) => {
  const url = new URL('/events', daemon.url.replace(/^http/, 'ws'))
  if (daemon.key) url.searchParams.set('key', daemon.key)
  return url.toString()
}

const parse = (data: unknown): OrrinEnvelope | undefined => {
  try {
    return JSON.parse(String(data)) as OrrinEnvelope
  } catch {
    return undefined
  }
}

export const followEvents = (daemon: Daemon, listeners: Listeners) => {
  const socket = new WebSocket(eventsUrl(daemon))
  socket.addEventListener('message', message => {
    const envelope = parse(message.data)
    if (envelope?.event) listeners.event(envelope.event)
  })
  socket.addEventListener('close', () => listeners.closed())
  return () => socket.close()
}
