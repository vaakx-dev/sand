import type { Server } from '@sand/server/contract'
import type { Context } from 'drydock'
import type { TitleSettings } from './contract'
import type { Prefs } from './prefs'
import { namingModel } from './name/model'
import type { Namer } from './name/namer'

export const serveTitles = (ctx: Context<'sessions'>, server: Server, prefs: Prefs, namer: Namer) => {
  const view = (): TitleSettings => {
    const { model, ...rest } = prefs.get()
    const shown = namingModel(ctx.llm, model)
    return { ...rest, ...(shown && { model: shown }) }
  }
  const share = () => server.broadcast('titles.change', [view()])
  const disposers = [
    server.handle('titles.get', view),
    server.handle('titles.save', async ({ auto, model, effort, speed }) => {
      await prefs.save({
        ...(typeof auto === 'boolean' && { auto }),
        ...(typeof model === 'string' && model && { model }),
        ...(effort && { effort }),
        ...(speed && { speed }),
      })
      share()
      return view()
    }),
    server.handle('titles.rename', async ({ session }) => {
      const live = ctx.sessions.open(String(session ?? ''))
      if (!live) throw new Error('That thread no longer exists')
      if (!live.messages().length) throw new Error('There is nothing to name yet')
      const title = await namer.rename(live)
      if (!title) throw new Error('No model could name this thread')
      return title
    }),
    ctx.on('llm.models', share),
  ]
  return () => disposers.forEach(dispose => void dispose())
}
