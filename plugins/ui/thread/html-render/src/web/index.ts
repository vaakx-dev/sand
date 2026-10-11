import type { Layout } from '@sand/dom'
import type { ToolRenderer, ToolViews } from '@sand/transcript-parts/contract'
import { joinDisposers } from '@sand/kit'
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
  uses: { transcript: 'renders are not shown', layout: 'swiping over a page does not move the sidebar' },
  apply(ctx) {
    let layout: Layout | undefined
    ctx.watch('layout', next => {
      layout = next
      return () => {
        layout = undefined
      }
    })
    const swipe = () => layout?.swipe()
    ctx.watch(
      'transcript',
      transcript =>
        transcript &&
        joinDisposers(
          transcript.tool('html_render', renderTool(ctx.toolViews)),
          transcript.entry('html-render', (entry, thread) => htmlFrame(ctx.wire, thread, entry.data as HtmlRenderEntry, swipe)),
        ),
    )
  },
})
