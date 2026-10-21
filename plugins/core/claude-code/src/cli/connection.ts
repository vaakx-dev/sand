import { errorMessage, isRecord } from '@sand/util'
import { spawnJsonLines } from '@sand/util/host'
import { requireClaude } from './binary'

export type Json = Record<string, unknown>

export const fieldsOf = (value: unknown): Json => (isRecord(value) ? value : {})

interface ConnectOptions {
  args: string[]
  env: Record<string, string>
  cwd: string
  handle(subtype: unknown, request: Json): Promise<unknown>
  onMessage(message: Json): void
  onExit(error: Error): void
}

interface Waiting {
  resolve(value: Json): void
  reject(error: Error): void
}

export type Connection = Awaited<ReturnType<typeof connect>>

export const connect = async ({ args, env, cwd, handle, onMessage, onExit }: ConnectOptions) => {
  const binary = await requireClaude()
  const waiting = new Map<string, Waiting>()
  let count = 0
  let closed = false

  const failAll = (error: Error) => {
    waiting.forEach(entry => entry.reject(error))
    waiting.clear()
  }

  const respond = (requestId: unknown, outcome: { response: unknown } | { error: string }) =>
    lines.send({
      type: 'control_response',
      response: 'error' in outcome ? { subtype: 'error', request_id: requestId, error: outcome.error } : { subtype: 'success', request_id: requestId, response: outcome.response },
    })

  const answer = (requestId: unknown, request: Json) =>
    handle(request.subtype, request).then(
      response => respond(requestId, { response: response ?? {} }),
      error => respond(requestId, { error: errorMessage(error) }),
    )

  const settle = (response: Json) => {
    const id = String(response.request_id)
    const entry = waiting.get(id)
    if (!entry) return
    waiting.delete(id)
    if (response.subtype === 'error') entry.reject(new Error(String(response.error ?? 'Claude Code refused the request')))
    else entry.resolve(fieldsOf(response.response))
  }

  const receive = (raw: unknown) => {
    const message = fieldsOf(raw)
    if (message.type === 'control_response') return settle(fieldsOf(message.response))
    if (message.type === 'control_request') return void answer(message.request_id, fieldsOf(message.request))
    if (message.type !== 'control_cancel_request') onMessage(message)
  }

  const lines = spawnJsonLines([binary, ...args], {
    cwd,
    env,
    onMessage: receive,
    onExit(code, stderr) {
      const error = new Error(`Claude Code stopped (exit ${code})${stderr ? `: ${stderr.split('\n').slice(-3).join(' ')}` : ''}`)
      failAll(error)
      if (!closed) onExit(error)
    },
  })

  const request = (subtype: string, body: Json = {}) =>
    new Promise<Json>((resolve, reject) => {
      const id = `sand-${++count}`
      waiting.set(id, { resolve, reject })
      lines.send({ type: 'control_request', request_id: id, request: { subtype, ...body } })
    })

  return {
    request,
    send: (message: Json) => lines.send(message),
    close() {
      closed = true
      failAll(new Error('Claude Code was closed'))
      lines.close()
    },
  }
}
