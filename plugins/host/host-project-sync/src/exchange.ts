import type { Project } from '@sand/host-projects/contract'
import type { RemoteRecord } from '@sand/host-remotes/contract'
import { errorMessage, fetchHostIdentity, requestTicket, ticketSocketUrl } from '@sand/kit'
import { remoteUrls } from '@sand/kit/host'
import type { ServerMessage } from '@sand/protocol'
import { cleanProjects } from './clean'

const identityTimeout = 3000
const answerTimeout = 15_000

export type Outcome =
  | { state: 'ok'; projects: Project[] }
  | { state: 'unreachable' | 'refused' | 'failed'; detail: string }

class Answered extends Error {}

const ask = (url: string, ticket: string, projects: Project[], sockets: Set<WebSocket>) =>
  new Promise<unknown>((resolve, reject) => {
    const socket = new WebSocket(ticketSocketUrl(url, ticket))
    sockets.add(socket)
    let done = false
    const finish = (error?: Error, result?: unknown) => {
      if (done) return
      done = true
      clearTimeout(timer)
      sockets.delete(socket)
      socket.close()
      if (error) reject(error)
      else resolve(result)
    }
    const timer = setTimeout(() => finish(new Error('no answer in time')), answerTimeout)
    socket.onopen = () => socket.send(JSON.stringify({ type: 'projects.sync', id: 1, projects }))
    socket.onerror = () => finish(new Error('the connection failed'))
    socket.onclose = () => finish(new Error('the connection closed'))
    socket.onmessage = event => {
      const message = JSON.parse(String(event.data)) as ServerMessage
      if (message.type !== 'result' || message.id !== 1) return
      if (message.error) finish(new Answered(message.error))
      else finish(undefined, message.result)
    }
  })

const answer = (result: unknown): Outcome => {
  try {
    return { state: 'ok', projects: cleanProjects(result) }
  } catch {
    return { state: 'failed', detail: 'it did not answer with a project list' }
  }
}

export const exchange = async (record: RemoteRecord, projects: Project[], sockets: Set<WebSocket>): Promise<Outcome> => {
  let last = 'no address to try'
  for (const url of remoteUrls(record)) {
    try {
      const identity = await fetchHostIdentity(url, identityTimeout)
      if (identity.deviceId !== record.id) {
        last = 'reached a different PC'
        continue
      }
      const ticket = await requestTicket(url, record.key)
      if (!ticket) return { state: 'refused', detail: 'it no longer accepts this PC; pair it again' }
      return answer(await ask(url, ticket.ticket, projects, sockets))
    } catch (error) {
      if (error instanceof Answered) return { state: 'failed', detail: error.message }
      last = errorMessage(error)
    }
  }
  return { state: 'unreachable', detail: last }
}
