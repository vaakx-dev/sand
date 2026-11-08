import { pcsChange } from '@sand/devices-contract'
import { firstRun } from '@sand/features/contract'
import { palette } from '@sand/palette/contract'
import { settings } from '@sand/settings/contract'
import { shell } from '@sand/ui-shell/contract'
import { projectsChange } from '@sand/web-client/contract'
import { pulse } from '@sand/reactive'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { firstProject } from './add/first'
import { addSheet } from './add/sheet'
import { newThreadSource, projectSource } from './add/source'
import { inject } from './context'
import { findSource } from './find/source'
import { openAt } from './settings/actions'
import { projectsPage } from './settings/page'

export default definePlugin({
  name: 'project',
  description: 'Projects settings page and its Add a project sheet, the first-run project step, and palette items to add a project, go to a file or search the project',
  inject,
  apply(ctx) {
    const changes = pulse(ctx, [projectsChange, pcsChange], [shell])
    ctx.watch(settings, found => found?.page({ id: 'projects', label: 'Projects', intro: 'Folders your threads work in, on each of your PCs.', icon: 'folder', group: 'workspace', order: 30, render: () => projectsPage(ctx, changes) }))
    ctx.watch(palette, found => found?.source(findSource(ctx)))
    ctx.watch(shell, frame => {
      if (!frame) return
      const addAndStart = () => {
        frame.sheet(addSheet(ctx, changes, target => openAt(ctx, target)))
      }
      return joinDisposers(
        ctx.watch(palette, found => found?.source(projectSource(addAndStart))),
        ctx.watch(palette, found => found?.source(newThreadSource(addAndStart))),
        ctx.watch(firstRun, run =>
          run?.step({
            feature: 'threads',
            render: next =>
              firstProject(
                ctx.kit,
                changes.read(() => ctx.projects.list().length),
                addAndStart,
                next,
              ),
          }),
        ),
      )
    })
  },
})
