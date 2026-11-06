import type { Box, UiElement } from '@sand/computers/contract'
import { serial } from '@sand/util'
import { join } from 'node:path'
import { fractionBox, type Screen } from './screen'

export interface RawElement {
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

const interactive = new Set(['button', 'checkbox', 'combobox', 'textbox', 'link', 'radio', 'slider', 'spinbutton', 'tab', 'treeitem', 'menuitem', 'listitem'])

export const parseLine = (line: string): RawElement | undefined => {
  const [type, name, ...fields] = line.split('\t')
  const numbers = fields.map(Number)
  if (!type || name === undefined || numbers.length !== 4 || numbers.some(Number.isNaN)) return undefined
  const [left = 0, top = 0, right = 0, bottom = 0] = numbers
  return { type, name, rect: { left, top, right, bottom } }
}

export const toElements = (raw: RawElement[], screen: Screen): UiElement[] =>
  raw.flatMap(({ type, name, rect }, index) => {
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
