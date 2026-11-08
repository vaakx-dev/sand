import { drafts } from '@sand/composer/contract'
import { homeRoute, type Route, type Shell } from '@sand/ui-shell/contract'
import type { ThreadVisit } from '@sand/web-client/contract'
import type { ChatContext } from '../context'
import { draftRoute, threadRoute } from '../contract'

const shows = (route: Route) => route.kind === threadRoute || route.kind === draftRoute

const same = (a: Route, b: Route) => a.kind === b.kind && a.id === b.id

const selected = (ctx: ChatContext): Route | undefined => {
  const id = ctx.threads.current()?.id
  if (id) return { kind: threadRoute, id }
  const draft = ctx.threads.drafting()
  return draft && { kind: draftRoute, id: draft.id }
}

const openDraft = (ctx: ChatContext, id: string) => {
  const draft = ctx.get(drafts)?.list().find(found => found.id === id)
  if (draft) void ctx.threads.draft(draft.cwd, draft.device, draft.id, { replace: true })
  else void ctx.threads.select(undefined, { replace: true })
}

export const claimRoute = (ctx: ChatContext, route: Route) => {
  const now = selected(ctx)
  if (!shows(route) || !route.id || (now && same(now, route))) return
  if (route.kind === threadRoute) void ctx.threads.select(route.id, { replace: true })
  else openDraft(ctx, route.id)
}

export const clearOnHome = (ctx: ChatContext, route: Route, first: boolean) => {
  if (route.kind === homeRoute && !first && ctx.threads.current()) void ctx.threads.select(undefined, { replace: true })
}

export const followSelect = (ctx: ChatContext, shell: Shell, visit: ThreadVisit) => {
  const target = selected(ctx)
  const now = shell.current()
  if (visit === 'restore' || !target || same(now, target)) return
  if (visit === 'replace' && !shows(now) && (target.kind === draftRoute || now.kind !== homeRoute)) return
  shell.open(target, { replace: true })
}
