import type { Kit, Tone } from '@sand/ui-kit/contract'
import type { ServerState, ServerStatus } from '../contract'
import { div, dynamicChild, span, type Sig } from '@vaakx-dev/vrui'

const looks: Record<ServerStatus['state'], { tone: Tone; label: string }> = {
  off: { tone: 'neutral', label: 'Off' },
  connecting: { tone: 'neutral', label: 'Connecting' },
  ready: { tone: 'success', label: 'Connected' },
  failed: { tone: 'danger', label: 'Failed' },
}

const serverDetail = (kit: Kit, { address, status }: ServerState) =>
  div(span({ class: 'font-mono text-neutral-500' }, address), status.state === 'failed' ? kit.errorText(status.error) : null)

const serverRow = (kit: Kit, server: Sig<ServerState>) =>
  kit.settingsRow(
    { title: server.map(value => value.name), detail: dynamicChild(server, value => serverDetail(kit, value)) },
    dynamicChild(server, ({ status }) => kit.badge(looks[status.state].tone, looks[status.state].label)),
  )

const serverRows = (kit: Kit, servers: Sig<ServerState[] | undefined>) =>
  dynamicChild(
    servers.map(value => value?.length ?? 0),
    count =>
      count
        ? kit.settingsSection(
            {},
            kit.rowList(
              servers.map(value => value ?? []),
              server => server.name,
              server => serverRow(kit, server),
            ),
          )
        : kit.emptyBlock({ icon: 'server', title: 'No MCP servers yet', text: 'Servers you add in sand.toml show up here, each as a tool group on the Tools page.' }),
  )

export const serversPage = (kit: Kit, servers: Sig<ServerState[] | undefined>) =>
  div(
    { class: 'flex flex-col gap-6' },
    kit.pageHead(
      'Add servers under [plugins.mcp.servers.<name>] in sand.toml, with command, args, env and cwd, or with url and headers. ${NAME} in args, env and headers reads an environment variable. Each server is a tool group on the Tools page.',
    ),
    dynamicChild(
      servers.map(value => value === undefined),
      loading => (loading ? kit.loadingState() : serverRows(kit, servers)),
    ),
  )
