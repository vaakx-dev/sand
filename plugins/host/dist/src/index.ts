import { hostApp } from '@sand/host-daemon/contract'
import { definePlugin } from 'drydock'
import { buildInfo } from './build'
import { hostBuild, type HostBuild } from './contract'

export default definePlugin({
  name: 'host-dist',
  description: 'The build id of this sand',
  inject: { hostApp },
  apply(ctx) {
    const build: HostBuild = { info: () => buildInfo(ctx.hostApp.root()) }
    ctx.provide(hostBuild, build)
    build.info().catch(error => ctx.report(error))
  },
})
