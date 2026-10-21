import { composer as composerService } from '@sand/composer/contract'
import type { NavAction } from '@sand/nav/contract'
import type { ChatContext } from '../context'

export const rewriteActions = (ctx: ChatContext, thread: string, entry: string, text: string): NavAction[] => {
  const composer = ctx.get(composerService)
  if (!composer || !text || ctx.threads.get(thread)?.running) return []
  const parent = () => ctx.threads.path(thread).find(found => found.id === entry)?.parent
  const edit = async () => {
    const before = parent()
    if (before === undefined) return
    const moved = await ctx.threads.checkout(thread, before).then(
      () => true,
      () => false,
    )
    if (moved && !composer.value().trim()) composer.set(text)
  }
  return [
    {
      id: 'edit',
      group: 'rewrite',
      label: 'Edit message',
      icon: 'pencil',
      confirm: 'Go back to before this message? The replies after it leave the chat.',
      run: edit,
    },
  ]
}
