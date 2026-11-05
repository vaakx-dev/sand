import type { Media } from '@sand/media/contract'
import type { Tool, Tools } from '@sand/tools/contract'
import type { Dispose } from 'drydock'
import type { ServerConfig } from './config'
import type { ServerState } from '../contract'
import { openLink, type Link } from './link'
import { groupOf, toolOf } from './tool'

export interface Needs {
  tools: Tools
  media: Media
  changed(): void
  report(error: unknown): void
}

const addressOf = (config: ServerConfig) => ('command' in config ? [config.command, ...config.args].join(' ') : config.url)

export const mountServer = ({ tools, media, changed, report }: Needs, name: string, config: ServerConfig) => {
  const group = groupOf(name)
  let link: Link | undefined
  let registered: Dispose[] = []

  const replace = (next: Tool[]) => {
    for (const dispose of registered) dispose()
    registered = next.map(tool => tools.register(tool))
  }

  const start = () => {
    const started = openLink(name, config, {
      listed: remote => replace(remote.map(tool => toolOf(name, tool, started.call, media))),
      changed,
      report,
    })
    return started
  }

  const stop = () => {
    link?.close()
    link = undefined
    replace([])
    changed()
  }

  const wanted = () => tools.groups().find(state => state.name === group)?.chosen !== 'off'

  const sync = () => {
    if (wanted() === Boolean(link)) return
    if (link) stop()
    else link = start()
  }

  const removeGroup = tools.group({ name: group, label: name, summary: `tools of the ${name} MCP server`, load: 'on-demand' })
  sync()

  return {
    state: (): ServerState => ({ name, address: addressOf(config), status: link?.status() ?? { state: 'off' } }),
    sync,
    dispose() {
      stop()
      removeGroup()
    },
  }
}

export type MountedServer = ReturnType<typeof mountServer>
