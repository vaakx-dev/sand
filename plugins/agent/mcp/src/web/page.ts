import type { Kit, Tone } from '@sand/ui-kit/contract'
import type { ServerState, ServerStatus } from '../contract'
import { div, dynamicChild, span, type Sig } from '@vaakx-dev/vrui'

const looks: Record<ServerStatus['state'], { tone?: Tone; label: string }> = {
  off: { label: 'Off' },
  connecting: { label: 'Connecting' },
  ready: { label: 'Connected' },
  failed: { tone: 'danger', label: 'Failed' },
}

const serverDetail = ({ errorText, toneText }: Kit, { address, status }: ServerState) => {
  const { tone, label } = looks[status.state]
  return div(
    { class: 'flex min-w-0 flex-col gap-1' },
    div(span({ class: tone && toneText[tone] }, label), ' · ', span({ class: 'font-mono wrap-anywhere' }, address)),
    status.state === 'failed' ? errorText(status.error) : null,
  )
}

const serverRow = (kit: Kit, server: Sig<ServerState>) =>
  kit.settingsRow({ title: server.map(value => value.name), detail: dynamicChild(server, value => serverDetail(kit, value)) })

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
        : kit.emptyState({ text: 'None. Add them under [plugins.mcp.servers.<name>] in sand.toml.' }),
  )

export const serversPage = (kit: Kit, servers: Sig<ServerState[] | undefined>) =>
  div(
    { class: 'flex flex-col gap-6' },
    dynamicChild(
      servers.map(value => value === undefined),
      loading => (loading ? kit.loadingState() : serverRows(kit, servers)),
    ),
  )
