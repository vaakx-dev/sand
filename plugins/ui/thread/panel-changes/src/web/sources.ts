import type { Thread } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import type { Source } from '../changes/tree'

const failingCalls = (thread: Thread) => [...thread.tools.results].flatMap(([id, result]) => (result.isError ? [id] : []))

const childrenOf = (ctx: Context<'threads'>, thread: Thread) =>
  ctx.threads.list().filter(other => other.info.kind === 'agent' && other.info.parent === thread.id)

export const sourceOf = (ctx: Context<'threads'>, thread: Thread, root = true, seen = new Set<string>()): Source => {
  seen.add(thread.id)
  return {
    id: thread.id,
    cwd: thread.info.cwd,
    entries: ctx.threads.path(thread.id),
    failing: failingCalls(thread),
    label: root ? undefined : (thread.info.title ?? undefined),
    origin: thread.info.origin,
    children: childrenOf(ctx, thread)
      .filter(child => !seen.has(child.id))
      .map(child => sourceOf(ctx, child, false, seen)),
  }
}

export const familyOf = (ctx: Context<'threads'>, thread: Thread, seen = new Set<Thread>()): Thread[] => {
  seen.add(thread)
  for (const child of childrenOf(ctx, thread)) if (!seen.has(child)) familyOf(ctx, child, seen)
  return [...seen]
}

export const familyKey = (family: Thread[]) => family.map(thread => `${thread.id}|${thread.info.head}|${thread.entries.size}|${thread.tools.results.size}`).join(';')
