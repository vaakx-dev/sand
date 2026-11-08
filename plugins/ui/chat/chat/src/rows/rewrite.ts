import { userParts, type Block, type Entry, type Message, type UserContent } from '@sand/chats/contract'
import { composer as composerService } from '@sand/composer/contract'
import type { MenuAction } from '@sand/ui-shell/contract'
import type { ChatContext } from '../context'

const isAttachment = (block: Block): block is Exclude<UserContent, { type: 'text' | 'context' }> =>
  block.type === 'image' || block.type === 'document' || block.type === 'file'

const contentOf = (entry?: Entry): UserContent[] => {
  if (entry?.type !== 'message') return []
  const message = entry.data as Message
  const records = userParts(message).flatMap(part => (part.kind === 'context' ? part.records : []))
  const context: UserContent[] = records.length ? [{ type: 'context', records }] : []
  return [...message.content.filter(isAttachment), ...context]
}

export const rewriteActions = (ctx: ChatContext, thread: string, entry: string, text: string): MenuAction[] => {
  const composer = ctx.get(composerService)
  if (!composer || ctx.threads.get(thread)?.running) return []
  const found = () => ctx.threads.path(thread).find(candidate => candidate.id === entry)
  const content = contentOf(found())
  if (!text && !content.length) return []
  const edit = async () => {
    const before = found()?.parent
    if (before === undefined) return
    const moved = await ctx.threads.checkout(thread, before).then(
      () => true,
      () => false,
    )
    if (moved) composer.restore({ text, content })
  }
  return [
    {
      id: 'edit',
      group: 'rewrite',
      label: 'Edit message',
      icon: 'pencil',
      confirm: 'Go back to before this message? Its replies stay, and you can switch back to them.',
      run: edit,
    },
  ]
}
