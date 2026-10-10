import { errorMessage } from '@sand/kit'
import type { Context, ScopeView } from 'drydock'
import type { BrowserState, Extensions } from '../contract'

export const reportStates = (ctx: Context, extensions: Extensions, mounted: ReadonlyMap<string, ScopeView>) => {
  const errors = new Map<string, string>()
  let sent = ''
  let timer: ReturnType<typeof setTimeout> | undefined

  const owner = (scope: ScopeView) => {
    for (let at: ScopeView | undefined = scope; at; at = at.parent) {
      const found = [...mounted].find(([, root]) => root === at)
      if (found) return found[0]
    }
    return undefined
  }

  const state = (id: string, status: BrowserState['status'], error: string | undefined, inject: string[]): BrowserState => {
    const scope = mounted.get(id)
    const missing = scope?.status === 'pending' ? scope.missing().map(String) : []
    const last = error ?? errors.get(id)
    return { id, status, inject, ...(last === undefined ? {} : { error: last }), ...(missing.length ? { missing } : {}) }
  }

  const send = async () => {
    timer = undefined
    const wire = ctx.wire
    if (!wire || wire.state() !== 'open') return
    const states = extensions.list().map(info => state(info.id, info.status, info.error, info.inject))
    const text = JSON.stringify(states)
    if (text === sent) return
    await wire.call({ type: 'web.extensions.report', states })
    sent = text
  }

  const schedule = () => {
    timer ??= setTimeout(() => void send().catch(() => undefined), 500)
  }

  ctx.on('drydock.error', (scope, error) => {
    const id = owner(scope)
    if (id === undefined) return
    errors.set(id, errorMessage(error))
    schedule()
  })
  ctx.on('drydock.status', schedule)
  ctx.on('extensions.change', () => {
    for (const id of errors.keys()) if (!mounted.has(id)) errors.delete(id)
    schedule()
  })
  ctx.on('wire.state', state => {
    if (state !== 'open') return
    sent = ''
    schedule()
  })
  schedule()
}
