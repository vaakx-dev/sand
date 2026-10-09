import type { ExtensionInfo, Extensions } from '../contract'
import { errorMessage } from '@sand/kit'
import type { Context, Scope } from 'drydock'
import type { BundledExtension } from 'sand:extensions'
import { initialWanted, type Wanted } from './wanted'

export const provideExtensions = (ctx: Context, build: string, bundled: BundledExtension[]) => {
  const mounted = new Map<string, Scope>()
  const pending = new Map<string, boolean | null>()
  let wanted = initialWanted(bundled)
  let resetting = false

  const mount = (id: string) => {
    const extension = bundled.find(candidate => candidate.id === id)
    if (!extension?.plugin || mounted.has(id)) return
    mounted.set(id, ctx.plugin(extension.plugin))
  }

  const unmount = (id: string) => {
    void mounted.get(id)?.dispose()
    mounted.delete(id)
  }

  const apply = (next: Wanted) => {
    wanted = { ...wanted, ...next }
    for (const extension of bundled) (wanted[extension.id] ? mount : unmount)(extension.id)
    ctx.emit('extensions.change')
  }

  const flush = async () => {
    const wire = ctx.wire
    if (!wire || wire.state() !== 'open') return
    if (resetting) await wire.call({ type: 'web.extensions.reset' })
    resetting = false
    for (const [id, enabled] of [...pending]) {
      pending.delete(id)
      await wire.call({ type: 'web.extensions.set', extension: id, enabled })
    }
    apply(await wire.call<Wanted>({ type: 'web.extensions' }))
  }

  const sync = () => void flush().catch(error => ctx.notify?.push(`Could not save the extension choice: ${errorMessage(error)}`, { level: 'error' }))

  const choose = (id: string, enabled: boolean) => {
    pending.set(id, enabled)
    sync()
    apply({ [id]: enabled })
  }

  const info = ({ id, builtin, plugin, provides, label, summary }: BundledExtension): ExtensionInfo => {
    const scope = mounted.get(id)
    return {
      id,
      builtin,
      enabled: Boolean(scope),
      configured: wanted[id] ?? false,
      bundled: Boolean(plugin),
      status: scope?.status ?? 'off',
      error: scope?.error === undefined ? undefined : errorMessage(scope.error),
      provides,
      inject: [...(plugin?.inject ?? [])],
      uses: { ...plugin?.uses },
      name: plugin?.name,
      label,
      summary,
      description: plugin?.description,
      scope: scope?.id,
    }
  }

  const service: Extensions = {
    list: () => bundled.map(info),
    enable: id => choose(id, true),
    disable: id => choose(id, false),
    reset() {
      pending.clear()
      resetting = true
      sync()
    },
    build: () => build,
  }

  ctx.provide('extensions', service)
  ctx.on('wire.state', state => {
    if (state === 'open') sync()
  })
  ctx.on('wire.event', event => {
    if (event.name === 'web.extensions') apply(event.args[0])
  })
  apply(wanted)
}
