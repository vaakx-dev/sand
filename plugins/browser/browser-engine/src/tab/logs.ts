import type { Cdp, ExceptionDetails, RemoteObject } from '../chrome'
import type { ConsoleEntry, LogLevel, NetworkEntry } from '../contract'

interface CallFrame {
  url: string
  lineNumber: number
}

interface Request {
  requestId: string
  type?: string
  request: { method: string; url: string }
}

const kept = 200
const maxText = 2000

const levels: Record<string, LogLevel> = { warning: 'warning', warn: 'warning', error: 'error', assert: 'error', info: 'info' }

const argText = (arg: RemoteObject) => String(arg.value ?? arg.unserializableValue ?? arg.description ?? arg.type)

const place = (url: string | undefined, line: number | undefined) => (url ? `${url.split('/').at(-1)}:${(line ?? 0) + 1}` : undefined)

const bounded = <T>(list: T[], item: T) => {
  list.push(item)
  if (list.length > kept) list.shift()
}

export const collectLogs = (cdp: Cdp, changed: () => void) => {
  const entries: ConsoleEntry[] = []
  const network = new Map<string, NetworkEntry>()
  const requests: NetworkEntry[] = []
  let errors = 0

  const add = (level: LogLevel, text: string, source?: string) => {
    bounded(entries, { level, text: text.slice(0, maxText), at: Date.now(), ...(source && { source }) })
    if (level !== 'error') return
    errors++
    changed()
  }

  cdp.on<{ type: string; args: RemoteObject[]; stackTrace?: { callFrames: CallFrame[] } }>('Runtime.consoleAPICalled', event => {
    const frame = event.stackTrace?.callFrames[0]
    add(levels[event.type] ?? 'log', event.args.map(argText).join(' '), place(frame?.url, frame?.lineNumber))
  })
  cdp.on<{ exceptionDetails: ExceptionDetails }>('Runtime.exceptionThrown', ({ exceptionDetails: details }) =>
    add('error', details.exception?.description ?? details.text, place(details.url, details.lineNumber)),
  )
  cdp.on<{ entry: { level: string; text: string; url?: string } }>('Log.entryAdded', ({ entry }) => {
    if (entry.level === 'warning' || entry.level === 'error') add(entry.level, entry.text, place(entry.url, undefined))
  })
  cdp.on<Request>('Network.requestWillBeSent', event => {
    const entry = { method: event.request.method, url: event.request.url, type: event.type ?? 'Other', at: Date.now() }
    network.set(event.requestId, entry)
    bounded(requests, entry)
  })
  cdp.on<{ requestId: string; response: { status: number } }>('Network.responseReceived', event => {
    const entry = network.get(event.requestId)
    if (entry) entry.status = event.response.status
  })
  cdp.on<{ requestId: string; errorText: string; canceled?: boolean }>('Network.loadingFailed', event => {
    const entry = network.get(event.requestId)
    if (entry && !event.canceled) entry.failed = event.errorText
    network.delete(event.requestId)
  })
  cdp.on<{ requestId: string }>('Network.loadingFinished', event => void network.delete(event.requestId))

  return {
    add,
    errors: () => errors,
    logs: () => ({ console: [...entries], network: [...requests] }),
    errorsSince: (at: number) => entries.filter(entry => entry.level === 'error' && entry.at >= at),
  }
}

export type TabLogs = ReturnType<typeof collectLogs>
