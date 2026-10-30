import { toolViews, transcript } from '@sand/chat/contract'
import { wire, wireHello } from '@sand/devices-contract'
import { settings } from '@sand/settings/contract'
import { kit } from '@sand/ui-kit/contract'
import { sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { toolsChangeWire, toolsChoose, toolsGroups, type GroupState, type ToolLoad } from '../contract'
import { foundRenderer } from './found'
import { toolsPage } from './page'

export default definePlugin({
  name: 'tools-web',
  description: 'Tools settings page: choose per group whether tools always load, load on demand or stay off. Shows find_tools calls in the chat.',
  inject: { wire, kit },
  apply(ctx) {
    const groups = sig<GroupState[] | undefined>(undefined)
    const load = () =>
      ctx.wire.call(toolsGroups, {}).then(
        value => groups.set(value),
        () => groups.set(undefined),
      )
    const choose = (group: string, load: ToolLoad) =>
      void ctx.wire.call(toolsChoose, { group, load }).then(value => groups.set(value), () => {})

    ctx.on(wireHello, () => void load())
    if (ctx.wire.ready()) void load()
    ctx.effect(() => ctx.wire.on(toolsChangeWire, value => groups.set(value)))
    ctx.watch(settings, found => found?.page({ id: 'tools', label: 'Tools', icon: 'wrench', order: 22, render: () => toolsPage(ctx.kit, groups, choose) }))
    ctx.watch(toolViews, views => views && ctx.watch(transcript, found => found?.tool('find_tools', foundRenderer(views))))
  },
})
