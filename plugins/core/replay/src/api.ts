import type { Plan } from '@sand/accounts/contract'
import { anthropicStream } from './anthropic'
import type { Reply, Script } from './contract'
import { planModels } from './models'

export const replayApi = (script: Script, base: () => string) => {
  const { id, label = id, replies } = script
  const queue = [...replies]
  const bodies: string[] = []
  let calls = 0
  const plan: Plan = {
    id,
    label,
    name: label,
    detail: 'Plays scripted replies over the Anthropic API',
    logo: 'replay',
    api: 'anthropic',
    signIn: () => Promise.reject(new Error(`${label} needs no sign-in`)),
    refresh: async tokens => tokens,
    call: (_, payload) => ({ url: `${base()}/${id}`, payload, headers: () => ({ 'content-type': 'application/json' }) }),
    models: async () => planModels(script),
  }
  const answer = async (request: Request) => {
    const body = await request.text()
    bodies.push(body)
    const reply: Reply = queue.shift() ?? [{ type: 'error', message: `${label} has no scripted reply left` }]
    const stream = anthropicStream(reply, JSON.parse(body).model, () => `${id}-${++calls}`)
    return new Response(stream, { headers: { 'content-type': 'text/event-stream' } })
  }
  return { plan, bodies, answer }
}
