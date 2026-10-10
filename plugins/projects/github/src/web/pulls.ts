import type { Context } from 'drydock'
import type { PrSummary, Pulls } from '../contract'

type Found = PrSummary | null | undefined

const same = (a: Found, b: Found) => JSON.stringify(a) === JSON.stringify(b)

export const createPulls = (ctx: Context<'wire'>): Pulls => {
  const known = new Map<string, Found>()
  const loading = new Set<string>()
  const again = new Set<string>()

  const keyOf = (device: string, cwd: string) => `${device}\0${cwd}`

  const settle = (cwd: string, device: string, found: Found) => {
    const key = keyOf(device, cwd)
    loading.delete(key)
    const before = known.get(key)
    known.set(key, found)
    if (!same(before, found)) ctx.emit('pulls.change')
    if (again.delete(key)) load(cwd, device, true)
  }

  const load = (cwd: string, device: string, forced: boolean) => {
    const key = keyOf(device, cwd)
    if (!cwd || ctx.wire.state() !== 'open') return
    if (loading.has(key)) return void (forced && again.add(key))
    if (!forced && known.has(key)) return
    loading.add(key)
    ctx.wire.call<PrSummary | null>({ type: 'github.pr', cwd }, device).then(
      found => settle(cwd, device, found ?? null),
      () => settle(cwd, device, known.get(key)),
    )
  }

  return {
    of(cwd, device) {
      if (!cwd) return undefined
      load(cwd, device ?? '', false)
      return known.get(keyOf(device ?? '', cwd))
    },
    refresh: (cwd, device) => load(cwd, device ?? '', true),
  }
}
