import { errorMessage } from '@sand/kit'
import type { Session } from '@sand/sessions-sqlite/contract'
import { definePlugin, type Context, type Handler } from 'drydock'
import type { Hook, HookFileState, HookOptions, HookScope } from '../contract'
import { isHookName } from '../wrap/args'
import { wrapHandler, type HookSlot, type WrapEnv } from '../wrap/wrap'
import type { HookSource } from './files'

export interface FilePlace {
  scope: HookScope
  folder: string
  source: string
  matches(session: Session | undefined): boolean
}

export type SharedEnv = Omit<WrapEnv, 'source' | 'matches' | 'slow'> & { slow(path: string): boolean }

export interface MountedFile {
  state: HookFileState
  dispose(): void
}

const mountWait = 1000

interface Registration {
  slot: HookSlot
  handler: (...args: unknown[]) => unknown
  options: HookOptions
}

const collect = async (file: HookSource) => {
  const registrations: Registration[] = []
  const module = await import(file.path)
  if (typeof module.default !== 'function') throw new Error('The file does not default-export a function')
  const hook = ((name: string, handler: unknown, options: HookOptions = {}) => {
    if (!isHookName(name)) throw new Error(`${name} is not a hook. Hooks: turn.prompt, turn.start, model.choose, context.build, llm.response, tool.before, tool.result, turn.stop, context.overflow, turn.end`)
    if (typeof handler !== 'function') throw new Error(`The handler for ${name} is not a function`)
    registrations.push({ slot: { name, timeouts: 0 }, handler: handler as Registration['handler'], options })
  }) as Hook
  await module.default(hook)
  return registrations
}

export const mountFile = async (ctx: Context, file: HookSource, place: FilePlace, shared: SharedEnv): Promise<MountedFile> => {
  const state: HookFileState = { path: file.path, scope: place.scope, folder: place.folder, status: 'active', hooks: [] }
  let registrations: Registration[]
  try {
    registrations = await collect(file)
  } catch (error) {
    state.status = 'failed'
    state.error = errorMessage(error)
    shared.notify(`Hook ${place.source} failed to load: ${state.error}`, 'error')
    return { state, dispose() {} }
  }
  const env: WrapEnv = { ...shared, source: place.source, matches: place.matches, slow: () => shared.slow(file.path) }
  state.hooks = registrations.map(({ slot }) => slot)
  const { promise: applied, resolve } = Promise.withResolvers<void>()
  const scope = ctx.plugin(
    definePlugin({
      name: `hook:${place.scope}/${file.name}`,
      apply(child) {
        for (const { slot, handler, options } of registrations) {
          const { priority, before, after, timeout } = options
          child.on(slot.name, wrapHandler(env, slot, handler, timeout) as Handler<typeof slot.name>, { priority, before, after })
        }
        resolve()
      },
    }),
  )
  await Promise.race([applied, Bun.sleep(mountWait)])
  return { state, dispose: () => void scope.dispose() }
}
