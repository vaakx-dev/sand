import { connections } from '@sand/connections/contract'
import { settings } from '@sand/settings/contract'
import { kit } from '@sand/ui-kit/contract'
import { errorMessage } from '@sand/util'
import { wire, wireHello } from '@sand/web-client/contract'
import { sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { orrinInstall, orrinProjectsChange, orrinRestart, orrinSetupChange, orrinSetupGet, orrinStart, type OrrinSetup } from '../contract'
import { manageActions } from './manage/actions'
import { managePage } from './manage/page'
import { projectSource } from './manage/source'
import { connectionState } from './state'

const pageId = 'orrin'

export default definePlugin({
  name: 'orrin-web',
  description: 'Shows Orrin on the Connections page with Install, Update, Start and Restart, and a Manage page for its projects and worker views',
  inject: { wire, kit },
  apply(ctx) {
    const setup = sig<OrrinSetup | undefined>(undefined)
    const source = projectSource(ctx.wire)
    const failed = (error: unknown) => setup.update(current => ({ updateAvailable: false, restartNeeded: false, ...current, error: errorMessage(error) }))
    const call = (request: typeof orrinSetupGet) => void ctx.wire.call(request, {}).then(value => setup.set(value), failed)
    const manage = () => ctx.get(settings)?.open(pageId)
    const actions = { install: () => call(orrinInstall), start: () => call(orrinStart), restart: () => call(orrinRestart), manage }
    const greet = () => {
      call(orrinSetupGet)
      void source.refresh()
    }

    ctx.on(wireHello, greet)
    if (ctx.wire.state() === 'open') greet()
    ctx.effect(() => ctx.wire.on(orrinSetupChange, value => setup.set(value)))
    ctx.effect(() => ctx.wire.on(orrinProjectsChange, value => source.set(value)))
    ctx.watch(connections, found =>
      found?.add({ id: 'orrin', name: 'Orrin', icon: 'orrin', order: 10, state: () => connectionState(setup.get(), actions) }),
    )
    ctx.watch(settings, found =>
      found?.page({
        id: pageId,
        label: 'Orrin',
        icon: 'orrin',
        parent: 'connections',
        order: 29,
        render: () => {
          void source.refresh()
          return managePage(ctx.kit, source, manageActions(ctx, source))
        },
      }),
    )
  },
})
