import { server } from '@sand/server/contract'
import { definePlugin } from 'drydock'
import { pluginsReport, pluginsShow } from './contract'
import { report } from './report/build'
import { detail } from './report/detail'

export default definePlugin({
  name: 'plugins',
  description: 'Reports every plugin and web extension with its status, errors and what turns it off, for the Plugins page, agents and outside tools',
  inject: { server },
  apply(ctx) {
    ctx.effect(() => ctx.server.handle(pluginsReport, () => report(ctx)))
    ctx.effect(() => ctx.server.handle(pluginsShow, ({ name }) => detail(ctx, name)))
  },
})
