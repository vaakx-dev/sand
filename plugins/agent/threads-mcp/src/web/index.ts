import { toolViews as toolViewsService, transcript as transcriptService, type ToolRenderer, type ToolViews } from '@sand/transcript/contract'
import { definePlugin } from 'drydock'
import { dd, div, dl, dt } from '@vaakx-dev/vrui'

const details = { model: 'Model', effort: 'Effort', project: 'Project', cwd: 'Folder', pc: 'PC', branch: 'Branch' }

const startRenderer = ({ errorBody, field }: ToolViews): ToolRenderer => ({
  icon: 'message',
  verb: 'Started thread',
  activeVerb: 'Starting thread',
  label: tool => field(tool.call.input, 'title') || (field(tool.call.input, 'prompt').split('\n')[0] ?? ''),
  meta: tool => (field(tool.call.input, 'worktree') === 'true' ? 'worktree' : ''),
  copy: tool => field(tool.call.input, 'prompt'),
  body(tool) {
    if (tool.result?.isError) return errorBody(tool)
    const rows = Object.entries(details).flatMap(([key, name]) => {
      const value = field(tool.call.input, key)
      return value ? [dt( { class: 'text-neutral-500' }, name), dd( { class: 'wrap-anywhere text-neutral-100' }, value)] : []
    })
    return div(
      { class: 'text-sm' },
      div({ class: 'whitespace-pre-wrap wrap-anywhere text-neutral-400' }, field(tool.call.input, 'prompt')),
      rows.length > 0 && dl({ class: 'mt-2 grid gap-x-4 gap-y-1 text-xs', style: { gridTemplateColumns: 'auto 1fr' } }, rows),
    )
  },
})

export default definePlugin({
  name: 'thread-tool-views',
  description: 'Shows thread_start calls as the prompt and the settings the thread starts with',
  inject: { toolViews: toolViewsService },
  apply(ctx) {
    ctx.watch(transcriptService, transcript => transcript?.tool('thread_start', startRenderer(ctx.toolViews)))
  },
})
