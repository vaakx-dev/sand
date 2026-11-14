import { wire, wireHello } from '@sand/devices-contract'
import { derive, sig, stored } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { helloTheme, offParam, offValue, themeAct, themeChanged, type ThemeState } from '../contract'
import { applyTheme } from './apply'

const askedOff = () => new URLSearchParams(location.search).get(offParam) === offValue

const forgetOff = () => {
  const url = new URL(location.href)
  url.searchParams.delete(offParam)
  history.replaceState(history.state, '', url)
}

export default definePlugin({
  name: 'themes-web',
  description: "Paints sand in the chosen theme: its colours, custom CSS and animated background. Opening sand with ?theme=off resets it to sand's own look",
  inject: { wire },
  apply(ctx) {
    const off = sig(askedOff())
    const state = stored<ThemeState | null>('sand.theme', null, value => typeof value === 'object')
    const take = (next: ThemeState | undefined) => {
      if (next) state.set(next)
    }

    const resetOnce = async () => {
      take(await ctx.wire.call(themeAct, { action: 'reset' }))
      forgetOff()
      off.set(false)
    }

    const hello = () => {
      if (off.get()) void resetOnce().catch(error => ctx.report(error))
      else take(ctx.wire.hello(helloTheme))
    }

    ctx.on(wireHello, hello)
    if (ctx.wire.ready()) hello()
    ctx.effect(() => ctx.wire.on(themeChanged, take))
    applyTheme(
      ctx,
      derive(() => (off.get() ? null : (state.get()?.theme ?? null))),
    )
  },
})
