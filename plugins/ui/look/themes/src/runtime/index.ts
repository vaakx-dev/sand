import { isPcUnavailable, peers, type Peers } from '@sand/devices-contract'
import { paths } from '@sand/paths/contract'
import { server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { join } from 'node:path'
import { helloTheme, themeAct, themeChanged, themeDecide, themeExchange } from '../contract'
import { createThemes, keptOf, type Kept } from './themes'

export default definePlugin({
  name: 'themes',
  description: "Keeps sand's one theme, the same on every device and PC: colours, custom CSS and an animated background. Agents try one out for 30 seconds unless the user keeps it",
  inject: { paths },
  async apply(ctx) {
    const reportFailure = (error: unknown) => {
      if (!isPcUnavailable(error)) ctx.report(error)
    }

    const share = async (kept: Kept) => {
      const linked = ctx.get(peers)
      if (!linked) return
      for (const outcome of await linked.callEach(themeExchange, kept)) if (!outcome.ok) reportFailure(outcome.error)
    }

    const themes = await createThemes(join(ctx.paths.home, 'theme.json'), {
      changed: state => ctx.get(server)?.broadcast(themeChanged, state),
      kept: kept => void share(kept).catch(reportFailure),
    })
    ctx.effect(() => themes.stop)

    const exchange = async (linked: Peers, pc: string) => {
      const theirs = await linked.call(pc, themeExchange, keptOf(themes.state()))
      await themes.take(theirs)
    }

    ctx.watch(server, found =>
      found
        ? joinDisposers(
            found.handle(themeAct, ({ action, theme }, caller) => themes.act(action, theme, Boolean(caller.actor))),
            found.handle(themeDecide, ({ trial, keep }) => themes.decide(trial, keep)),
            found.handle(themeExchange, incoming => themes.take(incoming)),
            found.hello(helloTheme, () => themes.state()),
          )
        : undefined,
    )
    ctx.watch(peers, linked => {
      if (!linked) return
      for (const pc of linked.connected()) void exchange(linked, pc).catch(reportFailure)
      return linked.onOpen(pc => void exchange(linked, pc).catch(reportFailure))
    })
  },
})
