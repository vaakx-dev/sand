import type { RuntimeView } from '@sand/host-runtimes/contract'

export type ClientFrame = { type: string; id: number } & Record<string, unknown>

const prompted = (key: unknown, live: RuntimeView[], prompts: Map<string, string>) => {
  const owner = typeof key === 'string' ? prompts.get(key) : undefined
  return live.find(runtime => runtime.id === owner)
}

const drainer = (session: string, live: RuntimeView[], current: RuntimeView | undefined) =>
  live.find(runtime => runtime.id !== current?.id && runtime.activity.sessions.includes(session))

export const promptKey = (request: ClientFrame) => {
  if (request.type === 'ui.pick.result') return request.pick
  if (request.type === 'ui.input.result') return request.input
  return undefined
}

export const route = (
  request: ClientFrame,
  live: RuntimeView[],
  current: RuntimeView | undefined,
  prompts: Map<string, string>,
): RuntimeView | undefined => {
  const key = promptKey(request)
  if (key !== undefined) return prompted(key, live, prompts) ?? current
  if (request.type === 'job.cancel') {
    const owner = live.find(runtime => runtime.activity.jobs.some(job => job.id === request.job))
    if (owner) return owner
  }
  if (typeof request.session === 'string') return drainer(request.session, live, current) ?? current
  return current
}
