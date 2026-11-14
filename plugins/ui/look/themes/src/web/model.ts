import { type Wire, wireHello } from '@sand/devices-contract'
import { derive, sig, stored } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { helloTheme, offParam, offValue, type Theme, themeAct, type ThemeAction, themeChanged, themeDecide, type ThemeState } from '../contract'

const askedOff = () => new URLSearchParams(location.search).get(offParam) === offValue

const forgetOff = () => {
  const url = new URL(location.href)
  url.searchParams.delete(offParam)
  history.replaceState(history.state, '', url)
}

export const themeModel = (ctx: Context, wire: Wire) => {
  const off = sig(askedOff())
  const state = stored<ThemeState | null>('sand.theme', null, value => typeof value === 'object')
  const preview = sig<Theme | null | undefined>(undefined)

  const take = (next: ThemeState | undefined) => {
    if (!next) return
    preview.set(undefined)
    state.set(next)
  }

  const call = (input: { action: ThemeAction; theme?: Theme }) =>
    wire.call(themeAct, input).then(take, error => {
      preview.set(undefined)
      ctx.report(error)
    })

  const resetOnce = async () => {
    take(await wire.call(themeAct, { action: 'reset' }))
    forgetOff()
    off.set(false)
  }

  const hello = () => {
    if (off.get()) void resetOnce().catch(error => ctx.report(error))
    else take(wire.hello(helloTheme))
  }

  ctx.on(wireHello, hello)
  if (wire.ready()) hello()
  ctx.effect(() => wire.on(themeChanged, take))

  const saved = derive(() => state.get()?.theme ?? null)

  return {
    state,
    saved,
    shown: derive(() => {
      if (off.get()) return null
      const previewing = preview.get()
      return previewing === undefined ? saved.get() : previewing
    }),
    preview: (theme: Theme | null) => preview.set(theme),
    set: (theme: Theme | null) => call(theme ? { action: 'set', theme } : { action: 'reset' }),
    reset: () => call({ action: 'reset' }),
    decide: (trial: string, keep: boolean) => wire.call(themeDecide, { trial, keep }).then(take, error => ctx.report(error)),
  }
}

export type ThemeModel = ReturnType<typeof themeModel>
