import type { ImageBlock } from '@sand/messages'
import type { ToolRenderer, ToolView } from '@sand/transcript-chat/contract'
import type { ToolViews } from '@sand/transcript-parts/contract'
import { div, el, img } from '@sand/dom'
import { definePlugin } from 'drydock'
import { consoleHeading } from '../output'

const screenshots = (tool: ToolView) => tool.result?.content.filter((block): block is ImageBlock => block.type === 'image') ?? []

const label = (tool: ToolView, { field }: ToolViews) => {
  const input = tool.call.input
  const width = field(input, 'width')
  return [field(input, 'path'), field(input, 'selector'), width ? `${width}px wide` : 'reply column'].filter(Boolean).join(' · ')
}

const previewRenderer = (views: ToolViews): ToolRenderer => ({
  icon: 'eye',
  verb: 'Previewed',
  activeVerb: 'Previewing',
  label: tool => label(tool, views),
  meta: tool => (tool.result && !tool.result.isError ? (views.resultText(tool.result).split('\n')[0] ?? '') : ''),
  copy: tool => views.field(tool.call.input, 'path'),
  body(tool) {
    if (!tool.result) return undefined
    if (tool.result.isError) return views.errorBody(tool)
    return div(
      { class: 'flex flex-col gap-2' },
      div(
        { class: 'flex max-h-96 flex-col overflow-auto rounded-md' },
        ...screenshots(tool).map(shot =>
          img({ class: 'block max-w-full', src: `data:${shot.mediaType};base64,${shot.data}`, alt: 'Preview' }),
        ),
      ),
      el('pre', { class: 'whitespace-pre-wrap wrap-anywhere font-mono text-xs text-neutral-400' }, views.resultText(tool.result).split(consoleHeading)[1] ?? ''),
    )
  },
})

export default definePlugin({
  name: 'html-preview-view',
  description: 'Shows html_preview calls as the screenshots and console output the agent saw',
  inject: ['toolViews'],
  uses: { transcript: 'previews use the generic tool view' },
  apply(ctx) {
    ctx.watch('transcript', transcript => transcript?.tool('html_preview', previewRenderer(ctx.toolViews)))
  },
})
