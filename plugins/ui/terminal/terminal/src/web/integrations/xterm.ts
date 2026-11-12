import type { Size } from '@sand/devices-terminal/contract'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { type ITheme, Terminal } from '@xterm/xterm'

export interface ScreenEvents {
  input(data: string): void
  propose(size: Size): void
}

const mac = /Mac|iPhone|iPad/.test(navigator.platform)

const clipboardKey = (event: KeyboardEvent, selected: boolean) => {
  const held = mac ? event.metaKey : event.ctrlKey && !event.metaKey
  if (!held || event.altKey) return false
  const key = event.key.toLowerCase()
  return key === 'v' || (key === 'c' && selected)
}

const openLink = (_: MouseEvent, uri: string) => void window.open(uri, '_blank', 'noopener,noreferrer')

export const createScreen = (colors: ITheme, events: ScreenEvents) => {
  const terminal = new Terminal({ fontSize: 13, lineHeight: 1.2, scrollback: 5000, theme: colors })
  const fit = new FitAddon()
  terminal.loadAddon(fit)
  terminal.loadAddon(new WebLinksAddon(openLink))
  terminal.onData(events.input)
  terminal.attachCustomKeyEventHandler(event => !(event.type === 'keydown' && clipboardKey(event, terminal.hasSelection())))
  const host = document.createElement('div')
  host.style.height = '100%'
  let opened = false

  const propose = () => {
    const size = fit.proposeDimensions()
    if (size && size.cols > 0 && size.rows > 0) events.propose({ cols: size.cols, rows: size.rows })
  }

  const afterWrites = (run: () => void) => terminal.write('', run)

  const open = (node: HTMLElement) => {
    terminal.options.fontFamily = getComputedStyle(node).fontFamily
    terminal.open(host)
    opened = true
  }

  return {
    attach(node: HTMLElement) {
      node.append(host)
      if (!opened) open(node)
      const observer = new ResizeObserver(propose)
      observer.observe(node)
      propose()
      terminal.refresh(0, terminal.rows - 1)
      return () => {
        observer.disconnect()
        if (host.parentNode === node) host.remove()
      }
    },
    grid: ({ cols, rows }: Size) =>
      afterWrites(() => {
        if (cols !== terminal.cols || rows !== terminal.rows) terminal.resize(cols, rows)
      }),
    write: (text: string, done?: () => void) => terminal.write(text, done),
    reset: () => afterWrites(() => terminal.reset()),
    note: (text: string) => terminal.write(`\r\n\x1b[2m${text}\x1b[0m\r\n`),
    paste: (text: string) => terminal.paste(text),
    focus: () => terminal.focus(),
    applicationCursor: () => terminal.modes.applicationCursorKeysMode,
    paint(next: ITheme) {
      terminal.options.theme = next
    },
    dispose: () => terminal.dispose(),
  }
}

export type Screen = ReturnType<typeof createScreen>

export type CreateScreen = typeof createScreen
