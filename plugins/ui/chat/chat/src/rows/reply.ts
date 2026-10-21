import { composer as composerService } from '@sand/composer/contract'
import type { NavAction } from '@sand/nav/contract'
import type { ChatContext } from '../context'

export const replyActions = (ctx: ChatContext, text: string): NavAction[] => {
  const composer = ctx.get(composerService)
  if (!composer || !text.trim()) return []
  return [{ id: 'reply', label: 'Quote in reply', icon: 'reply', run: () => composer.quote(text) }]
}
