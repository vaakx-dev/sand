import { findBrowser, launch, type Cdp } from '@sand/browser-engine/chrome'

const idleMs = 120_000

type Work<T> = (page: Cdp) => Promise<T>

export interface SearchBrowser {
  page<T>(work: Work<T>): Promise<T>
  close(): Promise<void>
}

const start = async () => {
  const executable = findBrowser()
  if (!executable) throw new Error('Web search needs Chrome, Edge or Chromium installed on this PC.')
  const chrome = await launch(executable)
  const { userAgent } = await chrome.browser.send<{ userAgent: string }>('Browser.getVersion')
  return { chrome, userAgent: userAgent.replace('HeadlessChrome', 'Chrome') }
}

type Started = Awaited<ReturnType<typeof start>>

export const searchBrowser = (): SearchBrowser => {
  let running: Promise<Started> | undefined
  let idle: ReturnType<typeof setTimeout> | undefined
  let busy = 0

  const close = async () => {
    const closing = running
    running = undefined
    await (await closing)?.chrome.close()
  }

  const started = () => {
    const starting = start()
    running = starting
    starting.then(
      ({ chrome }) => chrome.browser.closed.then(() => {
        if (running === starting) running = undefined
      }),
      () => {
        if (running === starting) running = undefined
      },
    )
    return starting
  }

  const inTab = async <T>({ chrome, userAgent }: Started, work: Work<T>) => {
    const tab = await chrome.open()
    try {
      await tab.cdp.send('Emulation.setUserAgentOverride', { userAgent })
      return await work(tab.cdp)
    } finally {
      tab.cdp.close()
      chrome.browser.fire('Target.closeTarget', { targetId: tab.id })
    }
  }

  return {
    async page(work) {
      clearTimeout(idle)
      busy++
      try {
        return await inTab(await (running ?? started()), work)
      } finally {
        busy--
        if (!busy) idle = setTimeout(() => void close(), idleMs)
      }
    },
    close() {
      clearTimeout(idle)
      return close()
    },
  }
}
