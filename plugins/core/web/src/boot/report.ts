import { errorMessage } from '@sand/util'
import { wire, wireState } from '@sand/web-client/contract'
import { collectScope, onTimeout } from '@vaakx-dev/vrui'
import { type Context, scopeError, type ScopeView, scopeStatus } from 'drydock'
import type { BundledExtension } from 'sand:extensions'
import { type BrowserState, webExtensionsReport } from '../contract'

const reportDelay = 500

export const reportStates = (ctx: Context, bundled: BundledExtension[], mounted: ReadonlyMap<string, ScopeView>) => {
  const errors = new Map<string, string>()
  let sent = ''
  let cancel: (() => void) | undefined

  const owner = (scope: ScopeView) => {
    for (let at: ScopeView | undefined = scope; at; at = at.parent) {
      const found = [...mounted].find(([, root]) => root === at)
      if (found) return found[0]
    }
    return undefined
  }

  const state = ({ id, plugin }: BundledExtension): BrowserState => {
    const scope = mounted.get(id)
    const missing = scope?.status === 'pending' ? scope.missing() : []
    const last = scope?.error === undefined ? errors.get(id) : errorMessage(scope.error)
    const inject = Object.values(plugin?.inject ?? {}).map(token => token.id)
    return { id, status: scope?.status ?? 'off', inject, ...(last !== undefined && { error: last }), ...(missing.length && { missing }) }
  }

  const send = async () => {
    cancel = undefined
    const connected = ctx.get(wire)
    if (!connected || connected.state() !== 'open') return
    const states = bundled.map(state)
    const text = JSON.stringify(states)
    if (text === sent) return
    await connected.call(webExtensionsReport, { states })
    sent = text
  }

  const schedule = () => {
    cancel ??= collectScope(() => onTimeout(() => void send().catch(() => undefined), reportDelay)).value
  }

  ctx.effect(() => () => cancel?.())

  ctx.on(scopeError, (scope, error) => {
    const id = owner(scope)
    if (id === undefined) return
    errors.set(id, errorMessage(error))
    schedule()
  })
  ctx.on(scopeStatus, schedule)
  ctx.on(wireState, state => {
    if (state !== 'open') return
    sent = ''
    schedule()
  })
  schedule()
}
