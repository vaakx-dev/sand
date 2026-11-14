import { toolViews, transcript, type ToolRenderer, type ToolView, type ToolViews } from '@sand/transcript/contract'
import { kit } from '@sand/ui-kit/contract'
import { joinDisposers } from '@sand/util'
import { definePlugin } from 'drydock'
import { themeTrialEntry, type ThemeTrialEntry } from '../../contract'
import type { ThemeModel } from '../model'
import { trialCard } from './card'

const verbs: Record<string, [done: string, active: string]> = {
  read: ['Read the theme', 'Reading the theme'],
  set: ['Tried a theme', 'Trying a theme'],
  reset: ['Reset the theme', 'Resetting the theme'],
}

const actionOf = (views: ToolViews, tool: ToolView) => views.field(tool.call.input, 'action') || 'set'

const themeView = (views: ToolViews): ToolRenderer => ({
  icon: 'palette',
  verb: 'Changed the theme',
  activeVerb: 'Changing the theme',
  label: tool => verbs[actionOf(views, tool)]?.[tool.status === 'running' || tool.status === 'pending' ? 1 : 0] ?? '',
  meta: tool => {
    const input = tool.call.input as { theme?: { name?: string } } | undefined
    return input?.theme?.name ?? ''
  },
  body: tool => (tool.result?.isError ? views.errorBody(tool) : undefined),
})

export const themeChat = (model: ThemeModel) =>
  definePlugin({
    name: 'themes-chat',
    description: 'Shows a theme an agent tried in its chat, with desktop and phone screenshots and Keep or Undo',
    inject: { kit, toolViews },
    apply(ctx) {
      ctx.watch(transcript, found =>
        found
          ? joinDisposers(
              found.tool('theme', themeView(ctx.toolViews)),
              found.entry(themeTrialEntry, (entry, thread) => trialCard(ctx.kit, ctx.toolViews, model, entry.data as ThemeTrialEntry, thread)),
            )
          : undefined,
      )
    },
  })
