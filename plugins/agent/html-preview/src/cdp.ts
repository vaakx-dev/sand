import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export interface RemoteObject {
  type: string
  value?: unknown
  unserializableValue?: string
  description?: string
}

export interface ExceptionDetails {
  text: string
  exception?: RemoteObject
}

interface Events {
  'Page.loadEventFired': unknown
  'Runtime.consoleAPICalled': { type: string; args: RemoteObject[] }
  'Runtime.exceptionThrown': { exceptionDetails: ExceptionDetails }
  'Log.entryAdded': { entry: { level: string; text: string; url?: string } }
}

interface Listener {
  method: string
  deliver(params: unknown): void
}

interface Waiting {
  resolve(result: unknown): void
  reject(error: Error): void
}

export interface Page {
  send<T = unknown>(method: string, params?: Record<string, unknown>): Promise<T>
  on<K extends keyof Events>(method: K, handler: (params: Events[K]) => void): void
}

export interface Browser {
  dir: string
  open(): Promise<Page>
  close(): Promise<void>
}

const listening = /DevTools listening on (ws:\/\/[^\s]+)/

const drain = async (reader: ReadableStreamDefaultReader<Uint8Array>) => {
  while (!(await reader.read()).done);
}

const devtoolsUrl = async (stderr: ReadableStream<Uint8Array>) => {
  const reader = stderr.getReader()
  const decoder = new TextDecoder()
  let text = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    text += decoder.decode(value, { stream: true })
    const found = listening.exec(text)
    if (!found) continue
    void drain(reader)
    return new URL(found[1]!)
  }
  throw new Error(`The browser exited before it was ready:\n${text.trim().slice(-2000)}`)
}

const connect = (url: string) =>
  new Promise<Page>((resolve, reject) => {
    const socket = new WebSocket(url)
    const pending = new Map<number, Waiting>()
    const listeners: Listener[] = []
    let next = 0
    socket.onopen = () =>
      resolve({
        send(method, params = {}) {
          const id = ++next
          socket.send(JSON.stringify({ id, method, params }))
          return new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
        },
        on(method, handler) {
          listeners.push({ method, deliver: handler })
        },
      })
    socket.onerror = () => reject(new Error('Could not connect to the browser'))
    socket.onclose = () => {
      for (const waiting of pending.values()) waiting.reject(new Error('The browser closed the connection'))
      pending.clear()
    }
    socket.onmessage = event => {
      const message = JSON.parse(String(event.data))
      const waiting = message.id === undefined ? undefined : pending.get(message.id)
      if (!waiting) {
        for (const listener of listeners) if (listener.method === message.method) listener.deliver(message.params)
        return
      }
      pending.delete(message.id)
      if (message.error) waiting.reject(new Error(message.error.message))
      else waiting.resolve(message.result)
    }
  })

const flags = (dir: string) => [
  '--headless=new',
  '--remote-debugging-port=0',
  `--user-data-dir=${dir}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-gpu',
  '--disable-extensions',
  '--disable-sync',
  '--hide-scrollbars',
  '--mute-audio',
  'about:blank',
]

const remove = (dir: string) => rm(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })

const spawn = async (executable: string, dir: string) => {
  try {
    return Bun.spawn([executable, ...flags(dir)], { stdin: 'ignore', stdout: 'ignore', stderr: 'pipe', windowsHide: true })
  } catch (error) {
    await remove(dir)
    throw error
  }
}

export const launch = async (executable: string): Promise<Browser> => {
  const dir = await mkdtemp(join(tmpdir(), 'sand-preview-'))
  const child = await spawn(executable, dir)
  const close = async () => {
    child.kill()
    await child.exited
    await remove(dir)
  }
  try {
    const url = await devtoolsUrl(child.stderr)
    return {
      dir,
      async open() {
        const response = await fetch(`http://${url.host}/json/new?about:blank`, { method: 'PUT' })
        const target: { webSocketDebuggerUrl: string } = await response.json()
        return connect(target.webSocketDebuggerUrl)
      },
      close,
    }
  } catch (error) {
    await close()
    throw error
  }
}
