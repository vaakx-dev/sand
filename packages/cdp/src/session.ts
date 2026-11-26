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
  timer: Timer
}

export interface Launch {
  executable: string
  profile: string
  args: string[]
  deadline: number
}

const LISTENING = /DevTools listening on (ws:\/\/\S+)\r?\n/
const POLL_MS = 50

const notStarted = () => new Error('The browser did not start. Check that Chrome or Edge runs and that no other Chrome uses the same profile, or set CHROME_PATH.')

const endpointOf = async (profile: string, deadline: number) => {
  while (Date.now() < deadline) {
    const file = Bun.file(join(profile, 'DevToolsActivePort'))
    const [port, path] = (await file.exists()) ? (await file.text()).split('\n') : []
    if (port && path) return `ws://127.0.0.1:${port}${path}`
    await Bun.sleep(POLL_MS)
  }
  throw notStarted()
}

const drain = async (output: ReadableStreamDefaultReader<string>) => {
  while (!(await output.read()).done);
}

const announcedEndpoint = async (output: ReadableStreamDefaultReader<string>) => {
  let printed = ''
  while (true) {
    const { done, value } = await output.read()
    if (done) throw notStarted()
    printed += value
    const endpoint = LISTENING.exec(printed)?.[1]
    if (endpoint) return endpoint
  }
}

const listeningOn = async (browser: Bun.Subprocess<'ignore', 'ignore', 'pipe'>, deadline: number) => {
  const output = browser.stderr.pipeThrough(new TextDecoderStream()).getReader()
  const late = setTimeout(() => browser.kill(), deadline - Date.now())
  const endpoint = await announcedEndpoint(output).finally(() => clearTimeout(late))
  void drain(output)
  return endpoint
}

const connect = (endpoint: string) =>
  new Promise<WebSocket>((resolve, reject) => {
    const socket = new WebSocket(endpoint)
    socket.onopen = () => resolve(socket)
    socket.onerror = () => reject(new Error('The browser refused the debug connection.'))
  })

const graceMs = 5_000
const callTimeoutMs = 30_000

class Unanswered extends Error {}

const session = (socket: WebSocket, process?: Bun.Subprocess) => {
  let last = 0
  const waiting = new Map<number, Waiting>()
  const listeners = new Set<(event: CdpEvent) => void>()
  const closed = Promise.withResolvers<void>()

  const take = (id: number) => {
    const call = waiting.get(id)
    waiting.delete(id)
    clearTimeout(call?.timer)
    return call
  }

  const unanswered = (id: number, method: string) => () =>
    take(id)?.reject(new Unanswered(`The browser did not answer ${method} within ${callTimeoutMs / 1000} seconds. The page may be stuck or throttled.`))

  socket.onmessage = ({ data }) => {
    const message: Incoming = JSON.parse(String(data))
    if (message.id === undefined) {
      for (const listener of listeners) listener(message)
      return
    }
    const call = take(message.id)
    if (!call) return
    if (message.error) call.reject(new Error(`The browser could not run ${call.method}: ${message.error.message}`))
    else call.resolve(message.result)
  }

  socket.onclose = () => {
    for (const id of waiting.keys()) {
      const call = take(id)
      call?.reject(new Error(`The browser closed during ${call.method}.`))
    }
    closed.resolve()
  }

  return {
    closed: closed.promise,
    call<T>(method: string, params: object = {}, sessionId?: string) {
      if (socket.readyState !== WebSocket.OPEN) return Promise.reject(new Error(`The browser closed before ${method}.`))
      return new Promise<T>((resolve, reject) => {
        const id = ++last
        waiting.set(id, { method, resolve: result => resolve(result as T), reject, timer: setTimeout(unanswered(id, method), callTimeoutMs) })
        socket.send(JSON.stringify({ id, method, params, sessionId }))
      })
    },
    on(listener: (event: CdpEvent) => void) {
      listeners.add(listener)
      return () => void listeners.delete(listener)
    },
    async close() {
      if (!process) {
        socket.close()
        return closed.promise
      }
      if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ id: ++last, method: 'Browser.close' }))
      await Promise.race([process.exited, Bun.sleep(graceMs)])
      process.kill()
      await process.exited
    },
  }
}

export type Browser = ReturnType<typeof session>

export const launch = async ({ executable, profile, args, deadline }: Launch): Promise<Browser> => {
  const browser = Bun.spawn([executable, ...args, '--remote-debugging-port=0', `--user-data-dir=${profile}`], { stdin: 'ignore', stdout: 'ignore', stderr: 'pipe' })
  try {
    return session(await connect(await listeningOn(browser, deadline)), browser)
  } catch (error) {
    browser.kill()
    await browser.exited
    throw error
  }
}

export const attach = async (profile: string, deadline: number): Promise<Browser> => session(await connect(await endpointOf(profile, deadline)))

export { Unanswered }
