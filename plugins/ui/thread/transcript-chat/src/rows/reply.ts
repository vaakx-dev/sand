import type { NavAction } from '@sand/protocol'
import type { Context } from 'drydock'

export const replyActions = (ctx: Context, text: string): NavAction[] => {
  const composer = ctx.composer
  if (!composer || !text.trim()) return []
  return [{ id: 'reply', label: 'Quote in reply', icon: 'reply', run: () => composer.quote(text) }]
}
