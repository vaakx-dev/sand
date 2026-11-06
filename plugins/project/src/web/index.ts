import { pcsChange } from '@sand/devices-contract'
import { firstRun } from '@sand/features/contract'
import { nav } from '@sand/nav/contract'
import { palette } from '@sand/palette/contract'
import { settings } from '@sand/settings/contract'
import { projectsChange } from '@sand/web-client/contract'
import { pulse } from '@sand/reactive'
import { definePlugin } from 'drydock'
import { inject } from './context'
import { findSource } from './find/source'
import { firstProject } from './new/first'
import { newThreadSource, projectSource } from './new/source'
import { sourcesPage } from './new/sources'
import { projectsPage } from './settings/page'

export default definePlugin({
  name: 'project',
  description: 'New project button, Projects settings page, and palette items to add a project, go to a file or search the project',
  inject,
  apply(ctx) {
    const changes = pulse(ctx, [projectsChange, pcsChange], [palette])
    ctx.watch(settings, found => found?.page({ id: 'projects', label: 'Projects', icon: 'folder', order: 30, render: () => projectsPage(ctx, changes) }))
    ctx.watch(palette, found => found?.source(projectSource(ctx)))
    ctx.watch(palette, found => found?.source(newThreadSource(ctx)))
    ctx.watch(palette, found => found?.source(findSource(ctx)))
    ctx.watch(palette, found =>
      found
        ? ctx.watch(nav, host => host?.action({ id: 'new-project', label: 'New project', icon: 'folder-plus', order: 10, run: () => found.open(sourcesPage(ctx)) }))
        : undefined,
    )
    ctx.watch(palette, found =>
      found
        ? ctx.watch(firstRun, run =>
            run?.step({
              feature: 'threads',
              render: next =>
                firstProject(
                  ctx.kit,
                  changes.read(() => ctx.projects.list().length),
                  () => found.open(sourcesPage(ctx)),
                  next,
                ),
            }),
          )
        : undefined,
    )
  },
})
