import type { NavAction } from '@sand/dom'
import { errorMessage } from '@sand/kit'
import type { Context } from 'drydock'

type Ctx = Context<'threads'>

export const rewriteActions = (ctx: Ctx, thread: string, entry: string, text: string): NavAction[] => {
  const composer = ctx.composer
  if (!composer || !text || ctx.threads.get(thread)?.running) return []
  const parent = () => ctx.threads.path(thread).find(found => found.id === entry)?.parent
  const attempt = (failed: string, work: (before: string | null) => Promise<unknown>) => async () => {
    const before = parent()
    if (before === undefined) return
    await work(before).catch(error => ctx.notify?.push(`${failed}: ${errorMessage(error)}`, { level: 'error' }))
  }
  const fork = async (before: string | null) => {
    const copy = await ctx.threads.branch(thread, before)
    await ctx.threads.select(copy.id)
    composer.set(text)
    ctx.notify?.push('Forked into a new thread')
  }
  const edit = async (before: string | null) => {
    await ctx.threads.checkout(thread, before)
    if (!composer.value().trim()) composer.set(text)
    ctx.notify?.push('Moved to before this prompt')
  }
  return [
    { id: 'fork', group: 'rewrite', label: 'Fork from here', icon: 'fork', run: attempt('Could not fork', fork) },
    {
      id: 'edit',
      group: 'rewrite',
      label: 'Edit message',
      icon: 'pencil',
      confirm: 'Go back to before this message? The replies after it leave this thread until you jump back in the tree.',
      run: attempt('Could not edit', edit),
    },
  ]
}
