import { errorMessage } from '@sand/util'
import { spawnJsonLines } from '@sand/util/host'
import { stoppedError } from './binary'
import { fieldsOf, type Json } from './json'

interface RpcOptions {
  command: string[]
  app: string
  env?: Record<string, string | undefined>
  cwd?: string
  onNotify(method: string, params: Json): void
  onRequest(method: string, params: Json): Promise<unknown>
  onExit(error: Error): void
}

interface Waiting {
  resolve(value: Json): void
  reject(error: Error): void
}

type Rpc = ReturnType<typeof startRpc>

const METHOD_MISSING = -32601
const HANDLER_FAILED = -32000

class RpcError extends Error {
  override name = 'RpcError'

  constructor(
    message: string,
    readonly code?: number,
  ) {
    super(message)
  }

  get missing() {
    return this.code === METHOD_MISSING
  }
}

const rpcError = (app: string, raw: unknown) => {
  const { message, code } = fieldsOf(raw)
  return new RpcError(typeof message === 'string' && message ? message : `${app} refused the request`, typeof code === 'number' ? code : undefined)
}

const missing = (error: unknown) => error instanceof RpcError && error.missing

const startRpc = ({ command, app, env, cwd, onNotify, onRequest, onExit }: RpcOptions) => {
  const waiting = new Map<number, Waiting>()
  let count = 0
  let closed = false

  const failAll = (error: Error) => {
    waiting.forEach(entry => entry.reject(error))
    waiting.clear()
  }

  const settle = (message: Json) => {
    const id = Number(message.id)
    const entry = waiting.get(id)
    if (!entry) return
    waiting.delete(id)
    if (message.error) entry.reject(rpcError(app, message.error))
    else entry.resolve(fieldsOf(message.result))
  }

  const answer = (id: unknown, method: string, params: Json) =>
    onRequest(method, params).then(
      result => lines.send({ jsonrpc: '2.0', id, result: result ?? {} }),
      error => lines.send({ jsonrpc: '2.0', id, error: { code: HANDLER_FAILED, message: errorMessage(error) } }),
    )

  const receive = (raw: unknown) => {
    const message = fieldsOf(raw)
    const method = typeof message.method === 'string' ? message.method : undefined
    if (!method) return settle(message)
    if (message.id === undefined) return onNotify(method, fieldsOf(message.params))
    void answer(message.id, method, fieldsOf(message.params))
  }

  const lines = spawnJsonLines(command, {
    cwd,
    env,
    onMessage: receive,
    onExit(code, stderr) {
      const error = stoppedError(app, code, stderr)
      failAll(error)
      if (!closed) onExit(error)
    },
  })

  return {
    pid: lines.pid,
    request: (method: string, params: Json = {}) =>
      new Promise<Json>((resolve, reject) => {
        if (closed) return reject(new Error(`${app} was closed`))
        const id = ++count
        waiting.set(id, { resolve, reject })
        lines.send({ jsonrpc: '2.0', id, method, params })
      }),
    notify: (method: string, params: Json = {}) => lines.send({ jsonrpc: '2.0', method, params }),
    close() {
      closed = true
      failAll(new Error(`${app} was closed`))
      lines.close()
      return lines.exited.then(() => {})
    },
  }
}

export { missing, RpcError, startRpc, type Rpc }
