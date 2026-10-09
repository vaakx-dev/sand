import type { Context } from 'drydock'

export interface Background {
  count: number
  since?: number
}

export type BackgroundOf = (thread: string) => Background

export const backgroundOf =
  (ctx: Context): BackgroundOf =>
  thread => {
    const running = ctx.jobs?.list(thread).filter(job => job.status === 'running') ?? []
    return { count: running.length, since: running.length ? Math.min(...running.map(job => job.started)) : undefined }
  }

export const noBackground: BackgroundOf = () => ({ count: 0 })
