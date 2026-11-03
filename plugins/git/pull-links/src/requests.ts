import type { Server } from '@sand/server/contract'
import { joinDisposers } from '@sand/util'
import { autoSettleChange, autoSettleSet, helloAutoSettle, pullLink, pullLinks, pullLinksAll, pullOpen, pullUnlink, pullWatch } from './contract'
import type { ThreadLinks } from './links/links'
import { type OpenDeps, openPull } from './open/open'
import type { SettleSetting } from './settle/setting'
import type { Viewed } from './sweep/viewed'

export interface RequestDeps {
  links: ThreadLinks
  viewed: Viewed
  open: OpenDeps
  setting: SettleSetting
  settingChanged(on: boolean): void
}

export const servePullLinks = (server: Server, deps: RequestDeps) =>
  joinDisposers(
    server.handle(pullLinks, ({ session }) => {
      deps.viewed.touch(deps.links.thread(session).id)
      return deps.links.view(session)
    }),
    server.handle(pullLinksAll, () => deps.links.all()),
    server.handle(pullLink, ({ session, ref }) => deps.links.linkText(session, ref)),
    server.handle(pullUnlink, ({ session, pull }) => deps.links.unlink(session, pull)),
    server.handle(pullWatch, ({ session, pull, on }) => deps.links.watch(session, pull, on)),
    server.handle(pullOpen, request => openPull(deps.open, request)),
    server.hello(helloAutoSettle, () => deps.setting.on()),
    server.handle(autoSettleSet, async ({ on }) => {
      await deps.setting.set(on)
      server.broadcast(autoSettleChange, on)
      deps.settingChanged(on)
      return on
    }),
  )
