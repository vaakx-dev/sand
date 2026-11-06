import type { Browser, CdpEvent } from '@sand/cdp'

export type Call = <T>(method: string, params?: object) => Promise<T>

interface TargetInfo {
  targetId: string
  type: string
}

type TargetEvent = { method: 'Target.targetCreated'; params: { targetInfo: TargetInfo } } | { method: 'Target.targetDestroyed'; params: { targetId: string } }

export const openTabs = async (browser: Browser, visible: boolean) => {
  const pages: string[] = []
  const attached = new Map<string, Promise<Call>>()

  const add = ({ targetId, type }: TargetInfo) => {
    if (type === 'page' && !pages.includes(targetId)) pages.push(targetId)
  }

  const remove = (targetId: string) => {
    if (pages.includes(targetId)) pages.splice(pages.indexOf(targetId), 1)
    attached.delete(targetId)
  }

  browser.on((event: CdpEvent) => {
    const target = event as TargetEvent
    if (target.method === 'Target.targetCreated') add(target.params.targetInfo)
    if (target.method === 'Target.targetDestroyed') remove(target.params.targetId)
  })
  await browser.call('Target.setDiscoverTargets', { discover: true })
  const { targetInfos } = await browser.call<{ targetInfos: TargetInfo[] }>('Target.getTargets')
  targetInfos.forEach(add)

  const attach = async (targetId: string): Promise<Call> => {
    const { sessionId } = await browser.call<{ sessionId: string }>('Target.attachToTarget', { targetId, flatten: true })
    const call: Call = (method, params = {}) => browser.call(method, params, sessionId)
    await Promise.all([call('Page.enable'), call('DOM.enable'), call('Accessibility.enable')])
    if (visible) await call('Page.bringToFront')
    return call
  }

  const newTab = async () => {
    const { targetId } = await browser.call<{ targetId: string }>('Target.createTarget', { url: 'about:blank' })
    add({ targetId, type: 'page' })
    return targetId
  }

  return {
    browser,
    async current(): Promise<Call> {
      const targetId = pages.at(-1) ?? (await newTab())
      const call = attached.get(targetId) ?? attach(targetId)
      attached.set(targetId, call)
      return call
    },
  }
}

export type Tabs = Awaited<ReturnType<typeof openTabs>>
