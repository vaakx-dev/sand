import { pcs, wire } from '@sand/devices-contract'
import { inspector } from '@sand/inspector/contract'
import { toolViews, transcript, type ToolView } from '@sand/transcript/contract'
import { kit } from '@sand/ui-kit/contract'
import { threads } from '@sand/web-client/contract'
import { definePlugin } from 'drydock'
import { scriptEntry, type ScriptRun } from '../contract'
import { scriptDetails } from './details'
import { scriptStep } from './step'
import { createStore } from './store'

export default definePlugin({
  name: 'scripts-web',
  description: 'Shows scripts and their calls in the chat and Details, and stops them',
  inject: { wire, pcs, kit },
  apply(ctx) {
    const store = createStore(ctx, ctx)

    const saved = ({ thread, call }: ToolView) =>
      [...(ctx.get(threads)?.get(thread)?.entries.values() ?? [])].find(entry => entry.type === scriptEntry && (entry.data as ScriptRun).id === call.id)?.data as ScriptRun | undefined

    const run = (tool: ToolView) => store.run(tool.call.id) ?? saved(tool)

    ctx.watch(toolViews, views => views && ctx.watch(transcript, found => found?.tool('script', scriptStep({ kit: ctx.kit, views, run }))))
    ctx.watch(inspector, found => {
      const details = scriptDetails({ kit: ctx.kit, store, views: () => ctx.get(toolViews) })
      return found?.row({ id: 'scripts', group: 'helpers', order: 70, ...details })
    })
  },
})
