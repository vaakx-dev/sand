import type { RendererRegistry, ToolView } from '../contract'
import type { TranscriptContext } from '../context'
import { threads } from '@sand/web-client/contract'
import { div, list, type Derive, type Sig } from '@vaakx-dev/vrui'
import { fileOpener } from '../files'
import { openStates } from '../open'
import { toolStep } from './step'

export const toolSteps = (ctx: TranscriptContext, registry: RendererRegistry) => (tools: Sig<ToolView[]> | Derive<ToolView[]>, thread: string) => {
  const states = openStates()
  const cwd = ctx.get(threads)?.get(thread)?.info.cwd
  const options = { renderer: registry.toolRenderer, version: registry.version, fileOpener: fileOpener(ctx, thread) }
  return list(
    tools,
    tool => tool.call.id,
    tool => toolStep(ctx.kit, tool, { ...options, ...states.get(tool.get().call.id) }, cwd),
    div({ class: 'flex min-w-0 flex-col' }),
  )
}
