import type { Context } from 'drydock'

export const openDraft = (ctx: Context<'threads'>, path: string, device: string, id?: string) =>
  ctx.threads.draft(path, device, id).then(() => ctx.composer?.focus())
