import { transcript as transcriptService, type ToolRenderer, type ToolViews } from '@sand/transcript/contract'
import { joinDisposers } from '@sand/util'
import type { HtmlRenderEntry } from '../contract'
import { definePlugin } from 'drydock'
import { inject } from './context'
import { htmlFrame } from './frame'
import { frameHeights } from './heights'
import { previewView } from './preview'

const renderView = ({ errorBody, field }: ToolViews): ToolRenderer => ({
  icon: 'chart',
  verb: 'Rendered',
  activeVerb: 'Rendering',
  label: tool => field(tool.call.input, 'title'),
  copy: tool => field(tool.call.input, 'title'),
  body: tool => (tool.result?.isError ? errorBody(tool) : undefined),
})

export default definePlugin({
  name: 'html-view',
  description: 'Shows the pages the agent renders inline in the chat, in a sandboxed frame in the app theme',
  inject,
  apply(ctx) {
    const heights = frameHeights()
    ctx.watch(
      transcriptService,
      transcript =>
        transcript &&
        joinDisposers(
          transcript.tool('html_render', renderView(ctx.toolViews)),
          transcript.tool('html_preview', previewView(ctx.kit, ctx.toolViews)),
          transcript.entry('html-render', (entry, thread) => htmlFrame(ctx, heights, thread, entry.data as HtmlRenderEntry)),
        ),
    )
  },
})
