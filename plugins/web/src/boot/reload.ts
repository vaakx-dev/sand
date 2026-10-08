import type { Context } from 'drydock'

const token = () => new URLSearchParams(location.search).get('token') ?? ''

const latest = async () => {
  const response = await fetch(`/build?token=${encodeURIComponent(token())}`, { cache: 'no-store' })
  return response.ok ? response.text() : undefined
}

export const reloadOnNewBuild = (ctx: Context, build: string) => {
  const check = async (id?: string) => {
    const current = id ?? (await latest().catch(() => undefined))
    if (current && current !== build) location.reload()
  }
  ctx.on('wire.event', event => {
    if (event.name === 'web.build') check(event.args[0])
  })
  ctx.on('wire.state', state => {
    if (state === 'open') check()
  })
}
