import type { HtmlRenderEntry, ToolRenderer } from '@sand/protocol'
import { errorBody, field } from '@sand/conversation'
import { definePlugin } from 'drydock'
import { htmlFrame } from './frame'

const renderTool: ToolRenderer = {
  icon: 'chart',
  verb: 'Rendered',
  activeVerb: 'Rendering',
  label: tool => field(tool.call.input, 'title'),
  copy: tool => field(tool.call.input, 'path'),
  body: tool => (tool.result?.isError ? errorBody(tool) : undefined),
}

export default definePlugin({
  name: 'html-render-view',
  description: 'Shows the pages the agent renders inline in the thread, in a sandboxed frame in the app theme',
  inject: ['wire'],
  uses: { transcript: 'renders are not shown' },
  apply(ctx) {
    ctx.watch('transcript', transcript => {
      if (!transcript) return
      const disposers = [
        transcript.tool('html_render', renderTool),
        transcript.entry('html-render', (entry, thread) => htmlFrame(ctx.wire, thread, entry.data as HtmlRenderEntry)),
      ]
      return () => disposers.forEach(dispose => void dispose())
    })
  },
})
