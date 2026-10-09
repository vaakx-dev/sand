import type { ProjectRef } from '@sand/host-projects/contract'
import type { Sync } from '../contract'
import type { FlowContext } from './types'

const runSetup = async (ctx: FlowContext, sync: Sync, ref: ProjectRef, command: string) => {
  ctx.notify?.push(`Running ${command}…`)
  try {
    const { code, output } = await sync.setup(ref, command)
    if (code === 0) ctx.notify?.push(`${command} finished`)
    else ctx.notify?.report(`${command} failed (exit ${code})`, [{ kind: 'text', text: output.trim() || 'No output', mono: true }])
  } catch (error) {
    ctx.notify?.push(error instanceof Error ? error.message : String(error), { level: 'error' })
  }
}

export const offerSetup = async (ctx: FlowContext, path: string, device?: string) => {
  const sync = ctx.sync
  if (!sync || !ctx.notify) return
  const folder = await ctx.projects.inspect(path, device).catch(() => undefined)
  const command = folder?.setup
  if (!command) return
  ctx.notify.push(`This project has a setup command: ${command}`, {
    action: { label: 'Run setup', run: () => void runSetup(ctx, sync, { path, ...(device ? { device } : {}) }, command) },
    timeout: 30_000,
  })
}
