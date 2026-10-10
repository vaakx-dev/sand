import type { Server } from '@sand/server/contract'
import { bundle, type Bundle } from '../bundle/build'
import { readChoices, writeChoices, type Choices } from './choices'
import type { Extension } from './discover'

export interface SiteOptions {
  home: string
  safe: boolean
  find(enabled: Choices): Promise<Extension[]>
  configured: Choices
  report(problem: string): void
  broadcast: Server['broadcast']
}

const enabledOf = (extensions: Extension[]): Choices => Object.fromEntries(extensions.map(extension => [extension.id, extension.enabled]))

export const createSite = async ({ home, safe, find, configured, report, broadcast }: SiteOptions) => {
  let choices = safe ? {} : await readChoices(home)
  let extensions = await find({ ...configured, ...choices })

  const build = async () => {
    const built = await bundle(extensions)
    for (const problem of built.problems) report(problem)
    return built
  }

  let built: Bundle = await build()

  const publish = async () => {
    extensions = await find({ ...configured, ...choices })
    const missing = extensions.some(extension => extension.enabled && !built.tried.includes(extension.id))
    if (missing) {
      built = await build()
      broadcast('web.build', [built.id])
    }
    const enabled = enabledOf(extensions)
    broadcast('web.extensions', [enabled])
    return enabled
  }

  const save = async (next: Choices) => {
    choices = next
    if (!safe) await writeChoices(home, choices)
    return publish()
  }

  return {
    current: () => built,
    list: () => extensions,
    enabled: () => enabledOf(extensions),
    set(id: string, value: boolean | null) {
      const { [id]: _, ...rest } = choices
      return save(value === null ? rest : { ...rest, [id]: value })
    },
    reset: () => save({}),
  }
}
