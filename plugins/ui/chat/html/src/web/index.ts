import { toolViews, transcript as transcriptService, type ToolRenderer, type ToolViews } from '@sand/chat/contract'
import { wire } from '@sand/devices-contract'
import { kit } from '@sand/ui-kit/contract'
import { joinDisposers } from '@sand/util'
import type { HtmlRenderEntry } from '../contract'
import { definePlugin } from 'drydock'
import { htmlFrame } from './frame'
import { frameHeights } from './heights'

const renderTool = ({ errorBody, field }: ToolViews): ToolRenderer => ({
  icon: 'chart',
  verb: 'Rendered',
  activeVerb: 'Rendering',
  label: tool => field(tool.call.input, 'title'),
  copy: tool => field(tool.call.input, 'path'),
  body: tool => (tool.result?.isError ? errorBody(tool) : undefined),
})

export default definePlugin({
  name: 'html-view',
  description: 'Shows the pages the agent renders inline in the chat, in a sandboxed frame in the app theme',
  inject: { wire, toolViews, kit },
  apply(ctx) {
    const heights = frameHeights()
    ctx.watch(
      transcriptService,
      transcript =>
        transcript &&
        joinDisposers(
          transcript.tool('html_render', renderTool(ctx.toolViews)),
          transcript.entry('html-render', (entry, thread) => htmlFrame(ctx, heights, thread, entry.data as HtmlRenderEntry)),
        ),
    )
  },
})
