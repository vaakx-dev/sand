import { lightScheme, sand, sandLight, theme as themeService, type Theme as PageTheme } from '@sand/ui-theme/contract'
import { collectScope, effect, el, mount, onMedia, onTimeout, sig, untrack, type Sig } from '@vaakx-dev/vrui'
import type { Context, Dispose } from 'drydock'
import type { Theme } from '../contract'
import { modeOf, paletteOf } from '../palette'
import { pageCss } from './look'
import { runScene } from './scene'
import type { Colors } from './scenes'

const pageThemeOf = (theme: Theme, light: boolean): PageTheme => {
  const mode = modeOf(theme, light)
  return { palette: paletteOf(theme, mode), mode, page: (mode === 'light' ? sandLight : sand).page }
}

export const applyTheme = (ctx: Context, shown: Pick<Sig<Theme | null>, 'get'>) => {
  const light = sig(false)
  let current: PageTheme | undefined
  let provided: Dispose | undefined
  let dressed: Dispose[] = []

  const provide = () => {
    const previous = provided
    provided = current ? ctx.provide(themeService, current) : undefined
    previous?.()
  }

  const undress = () => {
    for (const stop of dressed) stop()
    dressed = []
  }

  const dress = (theme: Theme | null) => {
    undress()
    current = theme ? pageThemeOf(theme, light.get()) : undefined
    provide()
    if (!theme || !current) return
    dressed.push(mount(document.head, el('style', { 'data-plugin': 'themes' }, pageCss(theme))))
    if (theme.scene) dressed.push(runScene({ id: theme.scene, colors: current.palette as unknown as Colors, mode: current.mode, moving: theme.motion !== 'still' }))
  }

  ctx.effect(() => onMedia(lightScheme, matches => light.set(matches)))
  ctx.effect(() => {
    let last: string | undefined
    const stop = effect(() => {
      const theme = shown.get()
      const key = JSON.stringify([theme, light.get()])
      if (key !== last) untrack(() => collectScope(() => dress(theme)))
      last = key
    })
    return () => {
      stop()
      undress()
      provided?.()
      provided = undefined
      current = undefined
    }
  })
  ctx.watch(themeService, found => {
    if (current && found !== current) return onTimeout(provide)
  })
}
