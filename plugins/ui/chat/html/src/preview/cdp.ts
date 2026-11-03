import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export interface CdpEvent {
  method: string
  params: unknown
  sessionId?: string
}

interface Incoming extends CdpEvent {
  id?: number
  result?: unknown
  error?: { message: string }
}

interface Waiting {
  method: string
  resolve(result: unknown): void
  reject(error: Error): void
}

const flags = [
  '--headless=new',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-gpu',
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-component-update',
  '--disable-sync',
  '--disable-dev-shm-usage',
  '--hide-scrollbars',
  '--mute-audio',
  '--remote-debugging-port=0',
]

const endpointOf = async (profile: string, deadline: number) => {
  while (Date.now() < deadline) {
    const file = Bun.file(join(profile, 'DevToolsActivePort'))
    const [port, path] = (await file.exists()) ? (await file.text()).split('\n') : []
    if (port && path) return `ws://127.0.0.1:${port}${path}`
    await Bun.sleep(50)
  }
  throw new Error('The preview browser did not start. Check that Chrome or Edge runs, or set CHROME_PATH.')
}

const connect = (endpoint: string) =>
  new Promise<WebSocket>((resolve, reject) => {
    const socket = new WebSocket(endpoint)
    socket.onopen = () => resolve(socket)
    socket.onerror = () => reject(new Error('The preview browser refused the debug connection.'))
  })

const session = (socket: WebSocket, stop: () => Promise<void>) => {
  let last = 0
  const waiting = new Map<number, Waiting>()
  const listeners = new Set<(event: CdpEvent) => void>()

  socket.onmessage = ({ data }) => {
    const message: Incoming = JSON.parse(String(data))
    if (message.id === undefined) {
      for (const listener of listeners) listener(message)
      return
    }
    const call = waiting.get(message.id)
    waiting.delete(message.id)
    if (!call) return
    if (message.error) call.reject(new Error(`The preview browser could not render this page: ${call.method} failed: ${message.error.message}`))
    else call.resolve(message.result)
  }

  return {
    call<T>(method: string, params: object = {}, sessionId?: string) {
      return new Promise<T>((resolve, reject) => {
        const id = ++last
        waiting.set(id, { method, resolve: result => resolve(result as T), reject })
        socket.send(JSON.stringify({ id, method, params, sessionId }))
      })
    },
    on(listener: (event: CdpEvent) => void) {
      listeners.add(listener)
    },
    async close() {
      socket.close()
      await stop()
    },
  }
}

export type Browser = ReturnType<typeof session>

export const launch = async (executable: string, deadline: number): Promise<Browser> => {
  const profile = await mkdtemp(join(tmpdir(), 'sand-html-preview-'))
  const browser = Bun.spawn([executable, ...flags, `--user-data-dir=${profile}`, 'about:blank'], { stdout: 'ignore', stderr: 'ignore' })
  const stop = async () => {
    browser.kill()
    await browser.exited
    await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
  }
  try {
    return session(await connect(await endpointOf(profile, deadline)), stop)
  } catch (error) {
    await stop()
    throw error
  }
}
