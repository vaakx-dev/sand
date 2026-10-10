import type {} from '@sand/llm-accounts/contract'
import type {} from '@sand/loops/contract'
import type {} from '@sand/model/contract'
import type {} from '@sand/paths/contract'
import { definePlugin } from 'drydock'
import { titlesUI } from './command'
import { createNamer } from './name/namer'
import { loadPrefs } from './prefs'
import { serveTitles } from './serve'
import { titleOf } from './title'

export default definePlugin({
  name: 'titles',
  inject: ['paths', 'sessions'],
  async apply(ctx) {
    const prefs = await loadPrefs(ctx.paths.home)
    const namer = createNamer(ctx, prefs)
    ctx.provide('names', { suggest: namer.suggest })
    ctx.on('turn.start', (session, prompt) => {
      if (session.title) return
      const title = titleOf(prompt)
      if (!title) return
      session.rename(title, false)
      if (session.kind !== 'agent' && prefs.get().auto) void namer.replace(session, title, prompt)
    })
    ctx.watch('server', server => (server ? serveTitles(ctx, server, prefs) : undefined))
    ctx.plugin(titlesUI(namer))
  },
})
