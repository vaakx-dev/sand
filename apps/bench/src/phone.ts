import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { type BrowserContext, type CDPSession, chromium, devices, type Page } from 'playwright'

export interface WireCall {
  type: string
  start: number
  end: number
  sent: number
  received: number
}

export interface WireEvent {
  name: string
  at: number
  bytes: number
}

export interface PageBench {
  calls: WireCall[]
  events: WireEvent[]
  longTasks: { start: number; ms: number }[]
  tap: number
  visible(text: string): boolean
  count(text: string): number
  composer(): boolean
  scroller(text: string): Element
}

declare global {
  interface Window {
    bench: PageBench
  }
}

const watch = () => {
  const shown = (element: Element | null) => {
    if (!element?.checkVisibility({ contentVisibilityAuto: true, opacityProperty: true, visibilityProperty: true })) return false
    const box = element.getBoundingClientRect()
    return box.bottom > 0 && box.top < innerHeight && box.width > 0
  }
  const read = (element: Element | null) => shown(element) && !element?.closest('[contenteditable=true]')
  const tracked = new Map<string, Set<Text>>()
  const note = (node: Node) => {
    if (!tracked.size) return
    const check = (found: Text) => {
      for (const [text, nodes] of tracked) if (found.data.includes(text)) nodes.add(found)
    }
    if (node instanceof Text) return check(node)
    if (!(node instanceof Element)) return
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT)
    for (let found = walker.nextNode(); found; found = walker.nextNode()) check(found as Text)
  }
  new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'characterData') note(record.target)
      else record.addedNodes.forEach(note)
    }
  }).observe(document, { childList: true, subtree: true, characterData: true })
  const texts = (text: string) => {
    let nodes = tracked.get(text)
    if (!nodes) {
      const found = document.evaluate(`//text()[contains(., ${JSON.stringify(text)})]`, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
      nodes = new Set(Array.from({ length: found.snapshotLength }, (_, index) => found.snapshotItem(index) as Text))
      tracked.set(text, nodes)
    }
    for (const node of nodes) if (!node.isConnected || !node.data.includes(text)) nodes.delete(node)
    return [...nodes].map(node => node.parentElement)
  }
  let scrolled: { text: string; element: Element } | undefined
  const bench: PageBench = {
    calls: [],
    events: [],
    longTasks: [],
    tap: 0,
    visible: text => texts(text).some(read),
    count: text => texts(text).filter(read).length,
    composer: () => [...document.querySelectorAll('[contenteditable=true],textarea')].some(shown),
    scroller: text => {
      if (scrolled?.text === text && scrolled.element.isConnected) return scrolled.element
      let element = texts(text).find(shown) ?? null
      while (element && !(element.scrollHeight > element.clientHeight && /auto|scroll/.test(getComputedStyle(element).overflowY))) element = element.parentElement
      scrolled = { text, element: element ?? document.scrollingElement! }
      return scrolled.element
    },
  }
  window.bench = bench
  performance.setResourceTimingBufferSize(100_000)
  addEventListener('pointerdown', event => (bench.tap = event.timeStamp), true)
  new PerformanceObserver(list => {
    for (const task of list.getEntries()) bench.longTasks.push({ start: task.startTime, ms: task.duration })
  }).observe({ type: 'longtask', buffered: true })
  const Native = window.WebSocket
  window.WebSocket = class extends Native {
    constructor(url: string | URL, protocols?: string | string[]) {
      super(url, protocols)
      const sent = new Map<number, { type: string; at: number; bytes: number }>()
      const send = this.send.bind(this)
      this.send = data => {
        if (typeof data === 'string')
          try {
            const message = JSON.parse(data)
            if (typeof message.id === 'number') sent.set(message.id, { type: message.type, at: performance.now(), bytes: data.length })
          } catch {}
        send(data)
      }
      this.addEventListener('message', event => {
        if (typeof event.data !== 'string') return
        try {
          const message = JSON.parse(event.data)
          if (message.type === 'event') return void bench.events.push({ name: message.name, at: performance.now(), bytes: event.data.length })
          const asked = message.type === 'result' && sent.get(message.id)
          if (!asked) return
          sent.delete(message.id)
          bench.calls.push({ type: asked.type, start: asked.at, end: performance.now(), sent: asked.bytes, received: event.data.length })
        } catch {}
      })
    }
  }
}

export interface PhoneOptions {
  cpuSlowdown: number
}

export const startPhone = async ({ cpuSlowdown }: PhoneOptions) => {
  const profile = mkdtempSync(join(tmpdir(), 'sand-bench-chrome-'))
  const context: BrowserContext = await chromium.launchPersistentContext(profile, { ...devices['Pixel 7'], headless: true })
  await context.addInitScript(watch)
  const sessions = new WeakMap<Page, CDPSession>()
  return {
    context,
    async page(slowdown = cpuSlowdown) {
      const page = await context.newPage()
      const cdp = await context.newCDPSession(page)
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: slowdown })
      sessions.set(page, cdp)
      return page
    },
    cdp: (page: Page) => sessions.get(page)!,
    async close() {
      await context.close()
      rmSync(profile, { recursive: true, force: true })
    },
  }
}

export type Phone = Awaited<ReturnType<typeof startPhone>>
