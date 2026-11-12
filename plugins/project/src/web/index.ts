import { pcsChange } from '@sand/devices-contract'
import { sshHostsChange, sshMachines } from '@sand/devices-ssh/contract'
import { palette } from '@sand/palette/contract'
import { settings } from '@sand/settings/contract'
import { shell } from '@sand/ui-shell/contract'
import { projectsChange } from '@sand/web-client/contract'
import { pulse } from '@sand/reactive'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { projectAdd, type ProjectAdd } from '../contract'
import { addSheet } from './add/sheet'
import { newThreadSource, projectSource } from './add/source'
import { inject } from './context'
import { findSource } from './find/source'
import { projectsPage } from './settings/page'

export default definePlugin({
  name: 'project',
  description: 'Projects settings page, the Add project sheet, and palette items to add a project, go to a file or search the project',
  inject,
  apply(ctx) {
    const changes = pulse(ctx, [projectsChange, pcsChange, sshHostsChange], [shell, sshMachines])
    ctx.watch(settings, found => found?.page({ id: 'projects', label: 'Projects', intro: 'Folders your threads work in, on each of your PCs.', icon: 'folder', group: 'workspace', order: 30, render: () => projectsPage(ctx, changes) }))
    ctx.watch(palette, found => found?.source(findSource(ctx)))
    ctx.watch(shell, frame => {
      if (!frame) return
      const adder: ProjectAdd = { open: options => void frame.sheet(addSheet(ctx, changes, options)) }
      const add = () => adder.open()
      return joinDisposers(
        ctx.provide(projectAdd, adder),
        ctx.watch(palette, found => found?.source(projectSource(add))),
        ctx.watch(palette, found => found?.source(newThreadSource(add))),
      )
    })
  },
})
