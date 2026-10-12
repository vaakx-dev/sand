import { errorMessage, isRecord } from '@sand/kit'
import { spawnJsonLines } from '@sand/kit/host'

export type Json = Record<string, unknown>

export const fieldsOf = (value: unknown): Json => (isRecord(value) ? value : {})

interface RpcOptions {
  binary: string
  args: string[]
  onNotify(method: string, params: Json): void
  onRequest(method: string, params: Json): Promise<unknown>
  onExit(error: Error): void
}

interface Waiting {
  resolve(value: Json): void
  reject(error: Error): void
}

export type Rpc = ReturnType<typeof startRpc>

export const startRpc = ({ binary, args, onNotify, onRequest, onExit }: RpcOptions) => {
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
    if (message.error) entry.reject(new Error(String(fieldsOf(message.error).message ?? 'Codex refused the request')))
    else entry.resolve(fieldsOf(message.result))
  }

  const answer = (id: unknown, method: string, params: Json) =>
    onRequest(method, params).then(
      result => lines.send({ id, result: result ?? {} }),
      error => lines.send({ id, error: { code: -32000, message: errorMessage(error) } }),
    )

  const receive = (raw: unknown) => {
    const message = fieldsOf(raw)
    const method = typeof message.method === 'string' ? message.method : undefined
    if (!method) return settle(message)
    if (message.id === undefined) return onNotify(method, fieldsOf(message.params))
    void answer(message.id, method, fieldsOf(message.params))
  }

  const lines = spawnJsonLines([binary, ...args], {
    env: { ...process.env, OPENAI_API_KEY: undefined },
    onMessage: receive,
    onExit(code, stderr) {
      const error = new Error(`Codex stopped (exit ${code})${stderr ? `: ${stderr.split('\n').slice(-3).join(' ')}` : ''}`)
      failAll(error)
      if (!closed) onExit(error)
    },
  })

  return {
    request: (method: string, params: Json = {}) =>
      new Promise<Json>((resolve, reject) => {
        const id = ++count
        waiting.set(id, { resolve, reject })
        lines.send({ method, id, params })
      }),
    notify: (method: string, params: Json = {}) => lines.send({ method, params }),
    close() {
      closed = true
      failAll(new Error('Codex was closed'))
      lines.close()
    },
  }
}
