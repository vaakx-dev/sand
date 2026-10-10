import type { RenderTool, ToolRenderer } from '@sand/transcript-chat/contract'
import { genericRenderer } from './generic'

export const resolveRenderer = (name: string, found?: RenderTool | ToolRenderer): Required<ToolRenderer> => {
  const base = genericRenderer(name)
  if (!found) return base
  if (typeof found === 'function') return { ...base, body: found }
  const label = found.label ?? base.label
  return {
    icon: found.icon ?? base.icon,
    verb: found.verb ?? base.verb,
    activeVerb: found.activeVerb ?? found.verb ?? base.activeVerb,
    label,
    meta: found.meta ?? base.meta,
    badge: found.badge ?? base.badge,
    copy: found.copy ?? label,
    body: found.body ?? base.body,
    actions: found.actions ?? base.actions,
  }
}
