import { rm } from 'node:fs/promises'
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

export interface Launch {
  executable: string
  profile: string
  args: string[]
  deadline: number
}

const endpointOf = async (profile: string, deadline: number) => {
  while (Date.now() < deadline) {
    const file = Bun.file(join(profile, 'DevToolsActivePort'))
    const [port, path] = (await file.exists()) ? (await file.text()).split('\n') : []
    if (port && path) return `ws://127.0.0.1:${port}${path}`
    await Bun.sleep(50)
  }
  throw new Error('The browser did not start. Check that Chrome or Edge runs and that no other Chrome uses the same profile, or set CHROME_PATH.')
}

const connect = (endpoint: string) =>
  new Promise<WebSocket>((resolve, reject) => {
    const socket = new WebSocket(endpoint)
    socket.onopen = () => resolve(socket)
    socket.onerror = () => reject(new Error('The browser refused the debug connection.'))
  })

const graceMs = 5_000

const session = (socket: WebSocket, process: Bun.Subprocess) => {
  let last = 0
  const waiting = new Map<number, Waiting>()
  const listeners = new Set<(event: CdpEvent) => void>()
  const closed = Promise.withResolvers<void>()

  socket.onmessage = ({ data }) => {
    const message: Incoming = JSON.parse(String(data))
    if (message.id === undefined) {
      for (const listener of listeners) listener(message)
      return
    }
    const call = waiting.get(message.id)
    waiting.delete(message.id)
    if (!call) return
    if (message.error) call.reject(new Error(`The browser could not run ${call.method}: ${message.error.message}`))
    else call.resolve(message.result)
  }

  socket.onclose = () => {
    for (const call of waiting.values()) call.reject(new Error(`The browser closed during ${call.method}.`))
    waiting.clear()
    closed.resolve()
  }

  return {
    closed: closed.promise,
    call<T>(method: string, params: object = {}, sessionId?: string) {
      if (socket.readyState !== WebSocket.OPEN) return Promise.reject(new Error(`The browser closed before ${method}.`))
      return new Promise<T>((resolve, reject) => {
        const id = ++last
        waiting.set(id, { method, resolve: result => resolve(result as T), reject })
        socket.send(JSON.stringify({ id, method, params, sessionId }))
      })
    },
    on(listener: (event: CdpEvent) => void) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
    async close() {
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ id: ++last, method: 'Browser.close' }))
      await Promise.race([process.exited, Bun.sleep(graceMs)])
      process.kill()
      await process.exited
    },
  }
}

export type Browser = ReturnType<typeof session>

export const launch = async ({ executable, profile, args, deadline }: Launch): Promise<Browser> => {
  await rm(join(profile, 'DevToolsActivePort'), { force: true })
  const browser = Bun.spawn([executable, ...args, '--remote-debugging-port=0', `--user-data-dir=${profile}`], { stdout: 'ignore', stderr: 'ignore' })
  try {
    return session(await connect(await endpointOf(profile, deadline)), browser)
  } catch (error) {
    browser.kill()
    await browser.exited
    throw error
  }
}
