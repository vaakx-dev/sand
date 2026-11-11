import { pcHello, wire } from '@sand/devices-contract'
import { terminalExit, terminalGrid, terminalOutput, terminalsChange } from '@sand/devices-terminal/contract'
import { kit } from '@sand/ui-kit/contract'
import { shell, type Subject } from '@sand/ui-shell/contract'
import { sand, type Theme, theme } from '@sand/ui-theme/contract'
import xtermCss from '@xterm/xterm/css/xterm.css' with { type: 'text' }
import { definePlugin } from 'drydock'
import { terminalColors } from './colors'
import { drawer } from './drawer'
import { onPageShown } from './integrations/page'
import { createShelf, type Shelf } from './shelf'

const shelfKey = (session: string, device: string) => `${session}\u0000${device}`

export default definePlugin({
  name: 'terminal',
  description: "A live terminal drawer along the bottom of a chat, in the thread's folder on the thread's PC",
  inject: { kit, shell, wire },
  apply(ctx) {
    const colorsOf = (found: Theme | undefined) => terminalColors((found ?? sand).palette)
    const shelves = new Map<string, Shelf>()
    const folders = new Map<string, string>()
    const tabs = () => [...shelves.values()].flatMap(shelf => shelf.tabs())
    const tabOf = (id: string) => tabs().find(tab => tab.id() === id)

    const shelfOf = ({ session, device, cwd }: Subject & { cwd: string }) => {
      const key = shelfKey(session, device)
      folders.set(key, cwd)
      const found = shelves.get(key)
      if (found) return found
      const made = createShelf({ session, device, cwd: () => folders.get(key) ?? cwd }, ctx.wire, () => colorsOf(ctx.get(theme)))
      shelves.set(key, made)
      return made
    }

    ctx.kit.style(ctx, xtermCss)
    ctx.effect(() => () => {
      for (const shelf of shelves.values()) shelf.dispose()
      shelves.clear()
    })
    ctx.effect(() => ctx.wire.on(terminalOutput, frame => tabOf(frame.id)?.frame(frame), { from: 'all' }))
    ctx.effect(() => ctx.wire.on(terminalGrid, ({ id, ...size }) => tabOf(id)?.grid(size), { from: 'all' }))
    ctx.effect(() => ctx.wire.on(terminalExit, ({ id, code, end }) => tabOf(id)?.exited({ code, end }), { from: 'all' }))
    ctx.effect(() => ctx.wire.on(terminalsChange, ({ session }, pc) => shelves.get(shelfKey(session, pc))?.refresh(), { from: 'all' }))
    ctx.on(pcHello, pc => {
      for (const shelf of shelves.values()) if (shelf.place.device === pc) shelf.refresh()
      for (const tab of tabs()) if (tab.device === pc) tab.reconnect()
    })
    ctx.effect(() => onPageShown(shown => tabs().forEach(tab => tab.visible(shown))))
    ctx.watch(theme, found => tabs().forEach(tab => tab.paint(colorsOf(found))))
    ctx.effect(() =>
      ctx.shell.aside({
        id: 'terminal',
        kind: 'drawer',
        label: 'Terminal',
        icon: 'term',
        order: 30,
        shows: route => Boolean(ctx.shell.subjectOf(route)?.cwd),
        render: route => drawer({ kit: ctx.kit, shell: ctx.shell, shelfOf }, route),
      }),
    )
  },
})
