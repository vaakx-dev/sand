import type { Browser, CdpEvent } from '@sand/cdp'

export type Call = <T>(method: string, params?: object) => Promise<T>

interface TargetInfo {
  targetId: string
  type: string
  title: string
  url: string
  parentFrameId?: string
}

export interface FrameSession {
  id: string
  parent: string
  call: Call
  ref: string
}

type TargetEvent =
  | { method: 'Target.targetCreated'; params: { targetInfo: TargetInfo } }
  | { method: 'Target.targetDestroyed'; params: { targetId: string } }
  | { method: 'Target.attachedToTarget'; params: { sessionId: string; targetInfo: TargetInfo } }
  | { method: 'Target.detachedFromTarget'; params: { sessionId: string } }

export interface Tab {
  title: string
  url: string
  active: boolean
}

export const openTabs = async (browser: Browser) => {
  const pages: string[] = []
  const attached = new Map<string, Promise<Call>>()
  const frames = new Map<string, FrameSession>()
  let active: string | undefined
  let front: string | undefined
  let framesSeen = 0

  const add = ({ targetId, type }: Pick<TargetInfo, 'targetId' | 'type'>) => {
    if (type !== 'page' || pages.includes(targetId)) return
    pages.push(targetId)
    active = targetId
  }

  const remove = (targetId: string) => {
    const index = pages.indexOf(targetId)
    if (index < 0) return
    pages.splice(index, 1)
    attached.delete(targetId)
    if (active === targetId) active = pages[Math.max(0, index - 1)]
  }

  const session =
    (sessionId: string): Call =>
    (method, params = {}) =>
      browser.call(method, params, sessionId)

  const attachFrames = (call: Call) => call('Target.setAutoAttach', { autoAttach: true, waitForDebuggerOnStart: false, flatten: true, filter: [{ type: 'iframe' }] })

  const addFrame = (sessionId: string, { targetId, type, parentFrameId }: TargetInfo) => {
    if (type !== 'iframe' || !parentFrameId) return
    const call = session(sessionId)
    frames.set(sessionId, { id: targetId, parent: parentFrameId, call, ref: String(++framesSeen) })
    attachFrames(call).catch(() => frames.delete(sessionId))
  }

  browser.on((event: CdpEvent) => {
    const target = event as TargetEvent
    if (target.method === 'Target.targetCreated') add(target.params.targetInfo)
    if (target.method === 'Target.targetDestroyed') remove(target.params.targetId)
    if (target.method === 'Target.attachedToTarget') addFrame(target.params.sessionId, target.params.targetInfo)
    if (target.method === 'Target.detachedFromTarget') frames.delete(target.params.sessionId)
  })
  await browser.call('Target.setDiscoverTargets', { discover: true })
  const { targetInfos } = await browser.call<{ targetInfos: TargetInfo[] }>('Target.getTargets')
  targetInfos.forEach(add)

  const attach = async (targetId: string): Promise<Call> => {
    const { sessionId } = await browser.call<{ sessionId: string }>('Target.attachToTarget', { targetId, flatten: true })
    const call = session(sessionId)
    await Promise.all([call('Page.enable'), call('DOM.enable'), call('Accessibility.enable'), attachFrames(call)])
    return call
  }

  const create = async () => {
    const { targetId } = await browser.call<{ targetId: string }>('Target.createTarget', { url: 'about:blank' })
    add({ targetId, type: 'page' })
    return targetId
  }

  const select = (index: number) => {
    active = pages.at(index) ?? active
  }

  return {
    browser,
    framesIn: (parent: string) => [...frames.values()].filter(frame => frame.parent === parent),
    async current(): Promise<Call> {
      const targetId = active ?? (await create())
      const call = attached.get(targetId) ?? attach(targetId)
      attached.set(targetId, call)
      if (front !== targetId) {
        front = targetId
        await browser.call('Target.activateTarget', { targetId })
      }
      return call
    },
    async list(): Promise<Tab[]> {
      const { targetInfos } = await browser.call<{ targetInfos: TargetInfo[] }>('Target.getTargets')
      const infos = new Map(targetInfos.map(info => [info.targetId, info]))
      return pages.flatMap(targetId => {
        const info = infos.get(targetId)
        return info ? [{ title: info.title, url: info.url, active: targetId === active }] : []
      })
    },
    select,
    step(by: number) {
      if (active) select((pages.indexOf(active) + by) % pages.length)
    },
    create,
    async closeCurrent() {
      if (!active) return
      const targetId = active
      if (pages.length === 1) await create()
      await browser.call('Target.closeTarget', { targetId })
      remove(targetId)
    },
  }
}

export type Tabs = Awaited<ReturnType<typeof openTabs>>
