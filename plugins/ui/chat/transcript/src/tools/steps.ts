import type { RendererRegistry, ToolView } from '../contract'
import type { Kit } from '@sand/ui-kit/contract'
import { div, list, type Derive, type Sig } from '@vaakx-dev/vrui'
import { openStates } from '../open'
import { toolStep } from './step'

export const toolSteps = (kit: Kit, registry: RendererRegistry) => (tools: Sig<ToolView[]> | Derive<ToolView[]>, cwd?: string) => {
  const states = openStates()
  return list(
    tools,
    tool => tool.call.id,
    tool => toolStep(kit, tool, { renderer: registry.toolRenderer, version: registry.version, ...states.get(tool.get().call.id) }, cwd),
    div({ class: 'flex min-w-0 flex-col' }),
  )
}
