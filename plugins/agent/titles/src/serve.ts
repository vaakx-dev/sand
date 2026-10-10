import type { Server } from '@sand/server/contract'
import type { Context } from 'drydock'
import type { TitleSettings } from './contract'
import type { Prefs } from './prefs'
import { namingModel } from './name/model'

export const serveTitles = (ctx: Context, server: Server, prefs: Prefs) => {
  const view = (): TitleSettings => {
    const { auto, model } = prefs.get()
    const shown = namingModel(ctx.llm, model)
    return { auto, ...(shown && { model: shown }) }
  }
  const share = () => server.broadcast('titles.change', [view()])
  const disposers = [
    server.handle('titles.get', view),
    server.handle('titles.save', async ({ auto, model }) => {
      await prefs.save({ ...(typeof auto === 'boolean' && { auto }), ...(typeof model === 'string' && model && { model }) })
      share()
      return view()
    }),
    ctx.on('llm.models', share),
  ]
  return () => disposers.forEach(dispose => void dispose())
}
