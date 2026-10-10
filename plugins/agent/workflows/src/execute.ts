import type { Session } from '@sand/sessions-sqlite/contract'
import { untilAborted } from '@sand/kit'
import type { Context } from 'drydock'
import { join } from 'node:path'
import { createApi } from './api'
import { describeResult } from './result'
import type { Run } from './store'

export interface Execution {
  run: Run
  label: string
  parent: Session
  origin: string
  args: unknown
  job?: string
}

export const execute = async (ctx: Context<'agents'>, execution: Execution, signal: AbortSignal) => {
  const file = join(execution.run.dir, `script.${Date.now()}.ts`)
  await Bun.write(file, execution.run.script)
  const module = await import(file).finally(() => Bun.file(file).delete().catch(() => {}))
  if (typeof module.default !== 'function') {
    throw new Error('The workflow script must `export default async function (api) { … }`')
  }
  const controller = new AbortController()
  const scoped = AbortSignal.any([signal, controller.signal])
  const api = createApi(ctx, { ...execution, signal: scoped })
  try {
    scoped.throwIfAborted()
    const result = await untilAborted(Promise.resolve(module.default(api)), scoped)
    api.log('finished')
    return describeResult(result)
  } finally {
    controller.abort()
  }
}
