import { hub } from '@sand/host-hub/contract'
import { definePlugin } from 'drydock'
import {
  orrinChange,
  orrinEvent,
  orrinInstall,
  orrinProjectRemove,
  orrinProjectsChange,
  orrinProjectsGet,
  orrinProjectUnlanded,
  orrinRestart,
  orrinSetupChange,
  orrinSetupGet,
  orrinStart,
  orrinViewDrop,
  type OrrinEvent,
} from './contract'
import { createManage } from './manage'
import { orrinConfig, orrinHome, provideLink } from './plugin'
import { createSetup } from './setup'

const projectEvents = new Set<OrrinEvent['type']>(['project.created', 'main.moved', 'view.landed'])

export default definePlugin({
  name: 'orrin',
  description: 'Finds, installs, updates and starts Orrin on this PC, lists and removes its projects, and talks to its daemon; never stops it unless you ask for a restart',
  inject: { hub },
  config: orrinConfig,
  async apply(ctx, config) {
    const home = orrinHome(config)
    const link = await provideLink(ctx, home)
    const setup = createSetup({
      home,
      port: config.port,
      releases: config.releases,
      changed: state => ctx.hub.broadcast(orrinSetupChange, state),
      started: () => void link.connect().catch(error => ctx.report(error)),
    })
    const manage = createManage(link.service)
    const announce = () =>
      void manage.list().then(
        state => ctx.hub.broadcast(orrinProjectsChange, state),
        error => ctx.report(error),
      )
    ctx.on(orrinChange, () => {
      void setup.refresh()
      announce()
    })
    ctx.on(orrinEvent, event => {
      if (projectEvents.has(event.type)) announce()
    })
    ctx.effect(() => ctx.hub.handle(orrinSetupGet, () => setup.refresh()))
    ctx.effect(() => ctx.hub.handle(orrinInstall, () => setup.install()))
    ctx.effect(() => ctx.hub.handle(orrinStart, () => setup.start()))
    ctx.effect(() => ctx.hub.handle(orrinRestart, () => setup.restart()))
    ctx.effect(() => ctx.hub.handle(orrinProjectsGet, () => manage.list()))
    ctx.effect(() => ctx.hub.handle(orrinProjectUnlanded, ({ project }) => manage.unlanded(project)))
    ctx.effect(() => ctx.hub.handle(orrinProjectRemove, ({ project, deleteFolder }) => manage.remove(project, deleteFolder)))
    ctx.effect(() => ctx.hub.handle(orrinViewDrop, ({ view }) => manage.drop(view)))
    void setup.autostart().catch(error => ctx.report(error))
  },
})
