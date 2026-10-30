import type { Block, Entry, Message, UserContent } from '@sand/chats/contract'
import { composer as composerService } from '@sand/composer/contract'
import type { NavAction } from '@sand/nav/contract'
import type { ChatContext } from '../context'

const isAttachment = (block: Block): block is Exclude<UserContent, { type: 'text' }> =>
  block.type === 'image' || block.type === 'document' || block.type === 'file'

const attachmentsOf = (entry?: Entry) => (entry?.type === 'message' ? (entry.data as Message).content.filter(isAttachment) : [])

export const rewriteActions = (ctx: ChatContext, thread: string, entry: string, text: string): NavAction[] => {
  const composer = ctx.get(composerService)
  if (!composer || ctx.threads.get(thread)?.running) return []
  const found = () => ctx.threads.path(thread).find(candidate => candidate.id === entry)
  const content = attachmentsOf(found())
  if (!text && !content.length) return []
  const edit = async () => {
    const before = found()?.parent
    if (before === undefined) return
    const moved = await ctx.threads.checkout(thread, before).then(
      () => true,
      () => false,
    )
    if (moved && !composer.value().trim()) composer.restore({ text, content })
  }
  return [
    {
      id: 'edit',
      group: 'rewrite',
      label: 'Edit message',
      icon: 'pencil',
      confirm: 'Go back to before this message? The replies after it leave the thread.',
      run: edit,
    },
  ]
}
