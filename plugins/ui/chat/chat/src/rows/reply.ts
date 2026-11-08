import { composer as composerService } from '@sand/composer/contract'
import type { MenuAction } from '@sand/ui-shell/contract'
import type { ChatContext } from '../context'

export const replyActions = (ctx: ChatContext, text: string): MenuAction[] => {
  const composer = ctx.get(composerService)
  if (!composer || !text.trim()) return []
  return [{ id: 'reply', label: 'Quote in reply', icon: 'reply', run: () => composer.quote(text) }]
}
