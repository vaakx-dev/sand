import type { Kit } from '@sand/ui-kit/contract'
import type { Row, Subject } from '@sand/ui-shell/contract'
import { derive, div, dynamicChild, list, type Sig } from '@vaakx-dev/vrui'
import type { DevServer, SharedSite } from '../contract'

interface Shown extends DevServer {
  device: string
}

type Target = Pick<Shown, 'port' | 'session' | 'device'>

interface Actions {
  open(server: Target): void
  stop(server: Target): void
}

interface Card extends Actions {
  servers(subject: Subject): Shown[]
}

interface Line {
  row: Row
  hint: string
}

const captionOf = (count: number) => `Dev servers · ${count} running`

const keyOf = (server: Shown) => `${server.device} ${server.port} ${server.pid}`

const serverLine = (kit: Kit, { open, stop }: Actions, target: Target, { row, hint }: Line) =>
  div(
    { class: 'flex min-w-0 items-center gap-1' },
    kit.workRow({ surface: 'raised', class: 'min-w-0 flex-1', title: `Open ${hint}`, onClick: () => open(target) }, kit.rowBody(() => row)),
    kit.iconButton({ size: 'sm', 'aria-label': `Open ${row.label}`, title: 'Open', onClick: () => open(target) }, kit.icon('external', 'sm')),
    kit.iconButton({ size: 'sm', 'aria-label': `Stop ${row.label}`, title: 'Stop', onClick: () => stop(target) }, kit.icon('stop', 'sm')),
  )

const detailsLine = (kit: Kit, server: Shown): Line => ({
  hint: server.url,
  row: { id: keyOf(server), label: `localhost:${server.port}`, detail: () => kit.monoMeta(server.command), lead: () => kit.icon('globe', 'sm') },
})

const serversCard = (kit: Kit, card: Card) => (subject: () => Subject) => {
  const listed = derive(() => card.servers(subject()))
  return div(
    { class: 'flex min-w-0 flex-col' },
    kit.cardCaption(() => captionOf(listed.get().length)),
    list(listed, keyOf, (server: Sig<Shown>) => serverLine(kit, card, server.get(), detailsLine(kit, server.get())), div({ class: 'flex min-w-0 flex-col' })),
  )
}

const sharedRow = (kit: Kit, { port, title }: SharedSite): Row => ({ id: `shared ${port}`, label: title, detail: () => kit.monoMeta(`localhost:${port}`), lead: () => kit.icon('globe', 'sm') })

const sharedCard = (kit: Kit, actions: Actions, target: Target, site: SharedSite, running: () => boolean) => {
  const row = sharedRow(kit, site)
  const stopped = () => div({ class: 'px-2 py-2' }, kit.rowBody(() => ({ ...row, status: 'stopped', quiet: true })))
  return div(
    { class: 'flex min-w-0 flex-col' },
    dynamicChild(running, live => (live ? serverLine(kit, actions, target, { row, hint: site.title }) : stopped())),
  )
}

export { serversCard, sharedCard, type Shown, type Target }
