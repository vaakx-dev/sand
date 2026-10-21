import { runtimeChanged } from '@sand/host-runtimes/contract'
import { joinDisposers } from '@sand/util'
import { wire, wireState } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import { webBuild } from '../contract'

const latest = async () => {
  const response = await fetch('/build', { cache: 'no-store' })
  return response.ok ? response.text() : undefined
}

export const reloadOnNewBuild = (ctx: Context, build: string) => {
  const check = async (id?: string) => {
    const current = id ?? (await latest().catch(() => undefined))
    if (current && current !== build) location.reload()
  }
  ctx.watch(wire, found => found && joinDisposers(found.on(webBuild, id => void check(id)), found.on(runtimeChanged, () => void check())))
  ctx.on(wireState, state => {
    if (state === 'open') void check()
  })
}
