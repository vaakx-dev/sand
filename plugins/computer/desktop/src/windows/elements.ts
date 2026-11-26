import type { Box, UiElement } from '@sand/computers/contract'
import { serial } from '@sand/util'
import { join } from 'node:path'
import { fractionBox, type Screen } from './screen'

type Visibility = 'shown' | 'offscreen' | 'closed'

export interface RawElement {
  depth: number
  visibility: Visibility
  type: string
  name: string
  rect: Box
}

const script = join(import.meta.dir, 'uia.ps1')
const timeout = 15_000

const roles: Record<string, string> = {
  edit: 'textbox',
  hyperlink: 'link',
  image: 'img',
  radiobutton: 'radio',
  spinner: 'spinbutton',
  splitbutton: 'button',
  tab: 'tablist',
  tabitem: 'tab',
}

const visibilities = new Set<string>(['shown', 'offscreen', 'closed'])

const interactive = new Set(['button', 'checkbox', 'combobox', 'textbox', 'link', 'radio', 'slider', 'spinbutton', 'tab', 'treeitem', 'menuitem', 'listitem'])

const isVisibility = (value: string | undefined): value is Visibility => visibilities.has(value ?? '')

export const parseLine = (line: string): RawElement | undefined => {
  const [depth, visibility, type, name, ...fields] = line.split('\t')
  const numbers = [depth, ...fields].map(Number)
  if (!type || name === undefined || !isVisibility(visibility) || numbers.length !== 5 || numbers.some(Number.isNaN)) return undefined
  const [level = 0, left = 0, top = 0, right = 0, bottom = 0] = numbers
  return { depth: level, visibility, type, name, rect: { left, top, right, bottom } }
}

const hidesInside = ({ visibility, type }: RawElement) => visibility === 'closed' || (visibility === 'offscreen' && type === 'Menu')

const onScreen = (raw: RawElement[]) => {
  let hiddenBelow = Infinity
  return raw.filter(element => {
    if (element.depth > hiddenBelow) return false
    hiddenBelow = hidesInside(element) ? element.depth : Infinity
    return element.visibility === 'shown'
  })
}

export const toElements = (raw: RawElement[], screen: Screen): UiElement[] =>
  onScreen(raw).flatMap(({ type, name, rect }, index) => {
    const lower = type.toLowerCase()
    const role = roles[lower] ?? lower
    const box = fractionBox(rect, screen)
    if (!box || !(name.trim() || interactive.has(role))) return []
    return [{ ref: `e${index}`, role, name: name.trim(), box }]
  })

const start = () => {
  const helper = Bun.spawn(['powershell.exe', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script], {
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'ignore',
    windowsHide: true,
  })
  const lines = helper.stdout.pipeThrough(new TextDecoderStream()).getReader()
  let buffered = ''
  const nextLine = async (): Promise<string> => {
    while (!buffered.includes('\n')) {
      const { value, done } = await lines.read()
      if (done) throw new Error(`The UI Automation helper stopped or took longer than ${timeout / 1000} s.`)
      buffered += value
    }
    const end = buffered.indexOf('\n')
    const line = buffered.slice(0, end).replace(/\r$/, '')
    buffered = buffered.slice(end + 1)
    return line
  }
  const read = async () => {
    const found: RawElement[] = []
    for (let line = await nextLine(); line !== 'end'; line = await nextLine()) {
      if (line.startsWith('error\t')) throw new Error(`UI Automation failed: ${line.slice(6)}`)
      const element = parseLine(line)
      if (element) found.push(element)
    }
    return found
  }
  return {
    helper,
    async request() {
      helper.stdin.write('elements\n')
      helper.stdin.flush()
      return read()
    },
  }
}

export const uiAutomation = () => {
  let running: ReturnType<typeof start> | undefined
  const queue = serial()

  const stop = () => {
    running?.helper.kill()
    running = undefined
  }

  const ask = async () => {
    const helper = (running ??= start())
    const timer = setTimeout(stop, timeout)
    try {
      return await helper.request()
    } catch (error) {
      stop()
      throw error
    } finally {
      clearTimeout(timer)
    }
  }

  return {
    elements: (screen: Screen) => queue(async () => toElements(await ask(), screen)),
    close: stop,
  }
}
