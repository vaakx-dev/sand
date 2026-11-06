import { pageBuild, wire, wireHello } from '@sand/devices-contract'
import type { Context } from 'drydock'
import { webBuild } from '../contract'

const latest = async () => {
  const response = await fetch('/build', { cache: 'no-store' })
  return response.ok ? response.text() : undefined
}

export const reloadOnNewBuild = (ctx: Context, build: string) => {
  const current = async (id?: string) => {
    const served = id ?? (await latest().catch(() => undefined))
    if (!served || served === build) return true
    location.reload()
    return false
  }
  ctx.provide(pageBuild, { current: () => current() })
  ctx.watch(wire, found => found?.on(webBuild, id => void current(id)))
  ctx.on(wireHello, () => void current())
}
