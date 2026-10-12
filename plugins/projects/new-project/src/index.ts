import { pulse } from '@sand/kit/web'
import { definePlugin } from 'drydock'
import { sourcesPage } from './flow/sources'
import { createSyncFlows } from './flow/sync/service'
import { projectsPage } from './settings/page'
import { newThreadSource, projectSource } from './source'

export default definePlugin({
  name: 'new-project',
  description: 'New project in the palette: add a folder, clone a Git URL or start an empty project, on this PC or another one',
  inject: ['projects', 'machines', 'threads', 'kit'],
  uses: {
    palette: 'nothing is shown',
    notify: 'no message after a project is added',
    composer: 'the new thread does not focus the prompt',
    sync: 'copy, send and merge flows say project sync is not available',
    settings: 'no Projects settings page',
    nav: 'no New project button',
    picker: 'projects cannot be renamed, and deleting asks with a second click instead of a prompt',
    turns: 'Let sand merge them fails',
  },
  apply(ctx) {
    ctx.provide('syncFlows', createSyncFlows(ctx))
    const changes = pulse(ctx, ['projects.change', 'machines.change'], ['palette'])
    ctx.watch('settings', settings => settings?.page({ id: 'projects', label: 'Projects', icon: 'folder', order: 30, render: () => projectsPage(ctx, changes) }))
    ctx.watch('palette', palette => palette?.source(projectSource(ctx)))
    ctx.watch('palette', palette => palette?.source(newThreadSource(ctx)))
    ctx.watch('palette', palette =>
      palette ? ctx.watch('nav', nav => nav?.action({ id: 'new-project', label: 'New project', icon: 'folder-plus', order: 10, run: () => palette.open(sourcesPage(ctx)) })) : undefined,
    )
  },
})
