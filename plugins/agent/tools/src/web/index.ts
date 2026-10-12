import type {} from '@sand/settings/contract'
import type {} from '@sand/transcript-parts/contract'
import type { GroupState, ToolLoad } from '../contract'
import { errorMessage } from '@sand/kit'
import { sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { foundRenderer } from './found'
import { toolsPage } from './page'

export default definePlugin({
  name: 'tools-web',
  description: 'Tools settings page: choose per group whether tools always load, load on demand or stay off. Shows find_tools calls in the thread.',
  inject: ['wire', 'kit'],
  uses: {
    settings: 'no Tools settings page',
    transcript: 'find_tools calls use the generic tool view',
    notify: 'failed changes are not reported',
  },
  apply(ctx) {
    const groups = sig<GroupState[] | undefined>(undefined)
    const fail = (error: unknown) => ctx.notify?.push(errorMessage(error), { level: 'error' })
    const load = () =>
      ctx.wire.call<GroupState[]>({ type: 'tools.groups' }).then(
        value => groups.set(value),
        () => groups.set(undefined),
      )
    const choose = (group: string, chosen: ToolLoad) =>
      void ctx.wire.call<GroupState[]>({ type: 'tools.choose', group, load: chosen }).then(value => groups.set(value), fail)

    ctx.on('wire.hello', () => void load())
    if (ctx.wire.state() === 'open') void load()
    ctx.on('wire.event', event => {
      if (event.name === 'tools.change') groups.set(event.args[0])
    })
    ctx.watch('settings', settings => settings?.page({ id: 'tools', label: 'Tools', icon: 'wrench', order: 22, render: () => toolsPage(ctx.kit, groups, choose) }))
    ctx.watch('toolViews', views => views && ctx.watch('transcript', transcript => transcript?.tool('find_tools', foundRenderer(views))))
  },
})
