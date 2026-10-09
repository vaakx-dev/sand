import type { ToolRenderer } from '@sand/transcript-chat/contract'
import type { ToolViews } from '@sand/transcript-parts/contract'
import type { HtmlRenderEntry } from '../contract'
import { definePlugin } from 'drydock'
import { htmlFrame } from './frame'

const renderTool = ({ errorBody, field }: ToolViews): ToolRenderer => ({
  icon: 'chart',
  verb: 'Rendered',
  activeVerb: 'Rendering',
  label: tool => field(tool.call.input, 'title'),
  copy: tool => field(tool.call.input, 'path'),
  body: tool => (tool.result?.isError ? errorBody(tool) : undefined),
})

export default definePlugin({
  name: 'html-render-view',
  description: 'Shows the pages the agent renders inline in the thread, in a sandboxed frame in the app theme',
  inject: ['wire', 'toolViews'],
  uses: { transcript: 'renders are not shown' },
  apply(ctx) {
    ctx.watch('transcript', transcript => {
      if (!transcript) return
      const disposers = [
        transcript.tool('html_render', renderTool(ctx.toolViews)),
        transcript.entry('html-render', (entry, thread) => htmlFrame(ctx.wire, thread, entry.data as HtmlRenderEntry)),
      ]
      return () => disposers.forEach(dispose => void dispose())
    })
  },
})
