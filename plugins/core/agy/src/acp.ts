import { acpArgs, requireBinary } from './binary'

type Json = Record<string, unknown>

interface PendingRequest {
  resolve(value: Json): void
  reject(error: Error): void
}

interface AcpOptions {
  folder?: string
  cwd?: string
  onNotify?(method: string, params: Json): void
  onRequest?(method: string, params: Json): Promise<unknown>
  onExit?(error: Error): void
}

interface AcpClient {
  pid: number
  request(method: string, params?: Json): Promise<Json>
  notify(method: string, params?: Json): void
  close(): Promise<void>
}

class RpcError extends Error {
  override name = 'RpcError'

  constructor(
    message: string,
    readonly code?: number,
  ) {
    super(message)
  }
}

const MAX_STDERR_CHARS = 4000

function fieldsOf(value: unknown): Json {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Json) : {}
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function toRpcError(raw: unknown): RpcError {
  const fields = fieldsOf(raw)
  const message = typeof fields.message === 'string' && fields.message ? fields.message : 'Antigravity refused the request'
  const code = typeof fields.code === 'number' ? fields.code : undefined
  return new RpcError(message, code)
}

function parseLine(line: string): Json | undefined {
  const trimmed = line.trim()
  if (!trimmed) return undefined
  try {
    return fieldsOf(JSON.parse(trimmed))
  } catch {
    return undefined
  }
}

async function startAcp(options: AcpOptions): Promise<AcpClient> {
  const binary = await requireBinary()
  const child = Bun.spawn([binary, ...acpArgs(options.folder)], {
    cwd: options.cwd,
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
    windowsHide: true,
  })

  const pending = new Map<number, PendingRequest>()
  let nextId = 0
  let closed = false
  let stderrTail = ''

  function write(payload: Json) {
    if (closed) return
    child.stdin.write(`${JSON.stringify(payload)}\n`)
    void child.stdin.flush()
  }

  function failAll(error: Error) {
    for (const entry of pending.values()) entry.reject(error)
    pending.clear()
  }

  function settleResponse(message: Json) {
    const id = Number(message.id)
    const entry = pending.get(id)
    if (!entry) return
    pending.delete(id)
    if (message.error) entry.reject(toRpcError(message.error))
    else entry.resolve(fieldsOf(message.result))
  }

  function handleIncomingRequest(id: unknown, method: string, params: Json) {
    const handler = options.onRequest
    if (!handler) {
      write({ jsonrpc: '2.0', id, error: { code: -32601, message: `Method not supported: ${method}` } })
      return
    }
    handler(method, params).then(
      result => write({ jsonrpc: '2.0', id, result: result ?? {} }),
      error => write({ jsonrpc: '2.0', id, error: { code: -32000, message: errorMessage(error) } }),
    )
  }

  function dispatch(message: Json) {
    const method = typeof message.method === 'string' ? message.method : undefined
    if (!method) {
      settleResponse(message)
      return
    }
    const params = fieldsOf(message.params)
    if (message.id === undefined) {
      options.onNotify?.(method, params)
      return
    }
    handleIncomingRequest(message.id, method, params)
  }

  async function readStdout() {
    const decoder = new TextDecoder()
    let buffer = ''
    for await (const chunk of child.stdout) {
      buffer += decoder.decode(chunk, { stream: true })
      for (;;) {
        const newline = buffer.indexOf('\n')
        if (newline < 0) break
        const message = parseLine(buffer.slice(0, newline))
        buffer = buffer.slice(newline + 1)
        if (message) dispatch(message)
      }
    }
    const trailing = parseLine(buffer)
    if (trailing) dispatch(trailing)
  }

  async function readStderr() {
    const decoder = new TextDecoder()
    for await (const chunk of child.stderr) {
      stderrTail = (stderrTail + decoder.decode(chunk, { stream: true })).slice(-MAX_STDERR_CHARS)
    }
  }

  const stdoutDone = readStdout().catch(() => {})
  const stderrDone = readStderr().catch(() => {})

  void child.exited.then(async code => {
    await Promise.all([stdoutDone, stderrDone])
    const detail = stderrTail.trim().split('\n').slice(-3).join(' ')
    const error = new Error(`Antigravity stopped (exit ${code})${detail ? `: ${detail}` : ''}`)
    failAll(error)
    if (!closed) options.onExit?.(error)
  })

  return {
    pid: child.pid,
    request(method: string, params: Json = {}) {
      return new Promise<Json>((resolve, reject) => {
        if (closed) {
          reject(new Error('Antigravity session is closed'))
          return
        }
        const id = ++nextId
        pending.set(id, { resolve, reject })
        write({ jsonrpc: '2.0', id, method, params })
      })
    },
    notify(method: string, params: Json = {}) {
      write({ jsonrpc: '2.0', method, params })
    },
    async close() {
      if (closed) return
      closed = true
      failAll(new Error('Antigravity session was closed'))
      try {
        child.stdin.end()
      } catch {}
      child.kill()
      await child.exited.catch(() => {})
    },
  }
}

async function withAcp<T>(folder: string | undefined, run: (client: AcpClient, init: Json) => Promise<T>): Promise<T> {
  const client = await startAcp({ folder })
  try {
    const init = await client.request('initialize', { protocolVersion: 1, clientCapabilities: {} })
    return await run(client, init)
  } finally {
    await client.close()
  }
}

export { errorMessage, fieldsOf, RpcError, startAcp, withAcp }
export type { AcpClient, AcpOptions, Json }
