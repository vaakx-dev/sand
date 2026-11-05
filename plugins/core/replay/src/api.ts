import type { Plan } from '@sand/accounts/contract'
import { anthropicStream } from './anthropic'
import type { Reply, Script } from './contract'

export const replayApi = ({ id, label = id, models, replies }: Script, base: () => string) => {
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
    models: async () => models.map(name => ({ name, label: name })),
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
