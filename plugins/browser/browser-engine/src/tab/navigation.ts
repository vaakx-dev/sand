import type { Cdp } from '../chrome'
import type { HistoryAction } from '../contract'

interface Frame {
  id: string
  url: string
  parentId?: string
}

interface History {
  currentIndex: number
  entries: { id: number; url: string; title: string }[]
}

interface Response {
  type: string
  frameId?: string
  response: { status: number }
}

const loadTimeoutMs = 20_000

export const trackNavigation = async (cdp: Cdp, changed: () => void) => {
  const { frameTree } = await cdp.send<{ frameTree: { frame: Frame } }>('Page.getFrameTree')
  const main = frameTree.frame.id
  let url = frameTree.frame.url
  let title = ''
  let loading = false
  let status: number | undefined
  let history: History = { currentIndex: 0, entries: [] }
  const idle = new Set<() => void>()

  const remember = (next: History) => {
    history = next
    title = next.entries[next.currentIndex]?.title ?? ''
    changed()
  }

  const refresh = () => cdp.send<History>('Page.getNavigationHistory').then(remember, () => undefined)

  const settle = () => {
    loading = false
    for (const resolve of idle) resolve()
    idle.clear()
    void refresh()
  }

  cdp.on<{ frameId: string }>('Page.frameStartedLoading', ({ frameId }) => {
    if (frameId !== main) return
    loading = true
    changed()
  })
  cdp.on<{ frameId: string }>('Page.frameStoppedLoading', ({ frameId }) => {
    if (frameId === main) settle()
  })
  cdp.on<{ frame: Frame }>('Page.frameNavigated', ({ frame }) => {
    if (frame.parentId) return
    url = frame.url
    void refresh()
  })
  cdp.on<{ frameId: string; url: string }>('Page.navigatedWithinDocument', event => {
    if (event.frameId !== main) return
    url = event.url
    void refresh()
  })
  cdp.on<Response>('Network.responseReceived', event => {
    if (event.type === 'Document' && event.frameId === main) status = event.response.status
  })

  const stopped = (timeoutMs: number) => Promise.race([new Promise<void>(resolve => idle.add(resolve)), Bun.sleep(timeoutMs)])

  const loaded = (timeoutMs = loadTimeoutMs) => (loading ? stopped(timeoutMs) : Promise.resolve())

  const open = async (target: string) => {
    status = undefined
    const stop = stopped(loadTimeoutMs)
    const { errorText, loaderId } = await cdp.send<{ errorText?: string; loaderId?: string }>('Page.navigate', { url: target })
    if (errorText) throw new Error(`Could not open ${target}: ${errorText}`)
    if (loaderId) await stop
  }

  const entry = (offset: number) => history.entries[history.currentIndex + offset]

  const go = async (action: HistoryAction) => {
    status = undefined
    if (action === 'reload') await cdp.send('Page.reload')
    else {
      const next = entry(action === 'back' ? -1 : 1)
      if (!next) throw new Error(`There is no page to go ${action} to`)
      await cdp.send('Page.navigateToHistoryEntry', { entryId: next.id })
    }
    await Bun.sleep(100)
    await loaded()
  }

  return {
    state: () => ({ url, title, loading, canBack: Boolean(entry(-1)), canForward: Boolean(entry(1)) }),
    opened: () => ({ url, title, ...(status !== undefined && { status }) }),
    loaded,
    open,
    go,
  }
}

export type Navigation = Awaited<ReturnType<typeof trackNavigation>>
