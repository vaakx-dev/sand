import { launch, type Chrome } from './chrome'
import type { Browser, TabState } from './contract'
import { openTab, type OpenedTab } from './tab/tab'

export interface BrowserEvents {
  changed(state: TabState): void
  closed(thread: string): void
}

interface Popup {
  targetInfo: { targetId: string; openerId?: string; url: string; type: string }
}

const sweepMs = 60_000

export const createBrowser = (executable: string, idleMs: number, events: BrowserEvents) => {
  const tabs = new Map<string, Promise<OpenedTab>>()
  const ready = new Map<string, OpenedTab>()
  const used = new Map<string, number>()
  let chrome: Promise<Chrome> | undefined

  const touch = (thread: string) => used.set(thread, Date.now())

  const redirectPopups = (started: Chrome) => {
    const popups = new Map<string, OpenedTab>()
    const redirect = ({ targetInfo }: Popup) => {
      const opener = popups.get(targetInfo.targetId)
      if (!opener || !targetInfo.url || targetInfo.url === 'about:blank') return
      popups.delete(targetInfo.targetId)
      started.browser.fire('Target.closeTarget', { targetId: targetInfo.targetId })
      opener.follow(targetInfo.url).catch(() => undefined)
    }
    started.browser.on<Popup>('Target.targetCreated', popup => {
      const opener = [...ready.values()].find(entry => entry.target === popup.targetInfo.openerId)
      if (!opener || popup.targetInfo.type !== 'page') return
      popups.set(popup.targetInfo.targetId, opener)
      redirect(popup)
    })
    started.browser.on<Popup>('Target.targetInfoChanged', redirect)
  }

  const start = async () => {
    const started = await launch(executable)
    await started.browser.send('Target.setDiscoverTargets', { discover: true })
    redirectPopups(started)
    return started
  }

  const running = () => {
    if (chrome) return chrome
    const starting = start()
    chrome = starting
    const reset = () => {
      if (chrome === starting) chrome = undefined
    }
    starting.then(started => started.browser.closed.then(reset), reset)
    return starting
  }

  const stop = async () => {
    const stopping = chrome
    chrome = undefined
    if (stopping) await (await stopping).close()
  }

  const forget = (thread: string) => {
    tabs.delete(thread)
    ready.delete(thread)
    used.delete(thread)
    events.closed(thread)
  }

  const open = async (thread: string) => {
    const opened = await openTab(await running(), thread, state => {
      touch(thread)
      events.changed(state)
    })
    ready.set(thread, opened)
    void opened.tab.closed.then(() => forget(thread))
    events.changed(opened.tab.state())
    return opened
  }

  const tab = async (thread: string) => {
    touch(thread)
    const existing = tabs.get(thread)
    if (existing) return (await existing).tab
    const opening = open(thread)
    tabs.set(thread, opening)
    opening.catch(() => tabs.delete(thread))
    return (await opening).tab
  }

  const close = async (thread: string) => {
    const opened = ready.get(thread)
    if (!opened || !chrome) return
    await (await chrome).browser.send('Target.disposeBrowserContext', { browserContextId: opened.context })
  }

  const sweep = setInterval(() => {
    for (const [thread, at] of used) if (Date.now() - at > idleMs) close(thread).catch(() => undefined)
    if (!tabs.size) stop().catch(() => undefined)
  }, sweepMs).unref()

  const shutdown = () => {
    clearInterval(sweep)
    return stop()
  }

  const browser: Browser = {
    tab,
    find: thread => {
      if (ready.has(thread)) touch(thread)
      return ready.get(thread)?.tab
    },
    close,
  }

  return { browser, shutdown }
}
