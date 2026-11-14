import type { Kit } from '@sand/ui-kit/contract'
import type { Subject } from '@sand/ui-shell/contract'
import { derive, div, list, type Sig } from '@vaakx-dev/vrui'
import type { DevServer } from '../contract'

interface Shown extends DevServer {
  device: string
}

interface Card {
  servers(subject: Subject): Shown[]
  open(server: Shown): void
  stop(server: Shown): void
}

const captionOf = (count: number) => `Dev servers · ${count} running`

const keyOf = (server: Shown) => `${server.device} ${server.port} ${server.pid}`

const serverLine = (kit: Kit, { open, stop }: Card, server: Shown) =>
  div(
    { class: 'flex min-w-0 items-center gap-1' },
    kit.workRow(
      { surface: 'raised', class: 'min-w-0 flex-1', title: `Open ${server.url}`, onClick: () => open(server) },
      kit.rowBody(() => ({
        id: keyOf(server),
        label: `localhost:${server.port}`,
        at: server.started,
        status: 'running',
        detail: () => kit.monoMeta(server.command),
        lead: () => kit.icon('globe', 'sm'),
      })),
    ),
    kit.iconButton({ size: 'sm', 'aria-label': `Open localhost:${server.port}`, title: 'Open', onClick: () => open(server) }, kit.icon('external', 'sm')),
    kit.iconButton({ size: 'sm', 'aria-label': `Stop localhost:${server.port}`, title: 'Stop', onClick: () => stop(server) }, kit.icon('stop', 'sm')),
  )

const serversCard = (kit: Kit, card: Card) => (subject: () => Subject) => {
  const listed = derive(() => card.servers(subject()))
  return div(
    { class: 'flex min-w-0 flex-col' },
    kit.cardCaption(() => captionOf(listed.get().length)),
    list(listed, keyOf, (server: Sig<Shown>) => serverLine(kit, card, server.get()), div({ class: 'flex min-w-0 flex-col' })),
  )
}

export { serversCard, type Shown }
