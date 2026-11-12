import { drafts } from '@sand/composer/contract'
import type { Route, Shell } from '@sand/ui-shell/contract'
import type { ChatContext } from '../context'
import { draftRoute, threadRoute } from '../contract'

const savedDraft = (ctx: ChatContext, id: string) => ctx.get(drafts)?.list().find(found => found.id === id)

const newDraft = (ctx: ChatContext, shell: Shell) => {
  const { id } = ctx.threads.plan({ cwd: ctx.threads.cwd(), device: ctx.threads.device() })
  shell.open({ kind: draftRoute, id }, { replace: true })
}

const showDraft = (ctx: ChatContext, id: string) => {
  const saved = ctx.threads.drafting()?.id === id ? undefined : savedDraft(ctx, id)
  if (saved) ctx.threads.plan({ id, cwd: saved.cwd, device: saved.device })
  ctx.threads.show({ draft: id })
}

export const claimRoute = (ctx: ChatContext, shell: Shell, { kind, id }: Route) => {
  if (kind === threadRoute && id) return ctx.threads.show({ thread: id })
  if (kind !== draftRoute) return
  if (id) return showDraft(ctx, id)
  newDraft(ctx, shell)
}

export const followStart = (shell: Shell, draft: string, thread: string) => {
  const { kind, id } = shell.current()
  if (kind === draftRoute && id === draft) shell.open({ kind: threadRoute, id: thread }, { replace: true })
}
