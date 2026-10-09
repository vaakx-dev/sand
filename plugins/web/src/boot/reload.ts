import type { Context } from 'drydock'

const latest = async () => {
  const response = await fetch('/build', { cache: 'no-store' })
  return response.ok ? response.text() : undefined
}

export const reloadOnNewBuild = (ctx: Context, build: string) => {
  const check = async (id?: string) => {
    const current = id ?? (await latest().catch(() => undefined))
    if (current && current !== build) location.reload()
  }
  ctx.on('wire.event', event => {
    if (event.name === 'web.build') check(event.args[0])
    if (event.name === 'runtime.changed') check()
  })
  ctx.on('wire.state', state => {
    if (state === 'open') check()
  })
}
