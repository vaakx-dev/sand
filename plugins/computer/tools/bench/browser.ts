import { attach, type Browser } from '@sand/cdp'
import type { Tab } from './tasks'

interface Target {
  targetId: string
  type: string
  url: string
}

const attachMs = 5_000

const read = `({
  url: location.href,
  title: document.title,
  text: document.body?.innerText ?? '',
  fields: Object.fromEntries([...document.querySelectorAll('input[name], select[name], textarea[name]')].map(field => [field.name, field.type === 'checkbox' ? field.checked : field.value])),
})`

const pagesOf = async (browser: Browser) => (await browser.call<{ targetInfos: Target[] }>('Target.getTargets')).targetInfos.filter(target => target.type === 'page')

const tabOf = async (browser: Browser, { targetId }: Target): Promise<Tab> => {
  const { sessionId } = await browser.call<{ sessionId: string }>('Target.attachToTarget', { targetId, flatten: true })
  const { result } = await browser.call<{ result: { value: Tab } }>('Runtime.evaluate', { expression: read, returnByValue: true }, sessionId)
  await browser.call('Target.detachFromTarget', { sessionId })
  return result.value
}

const using = async <T>(profile: string, work: (browser: Browser) => Promise<T>) => {
  const browser = await attach(profile, Date.now() + attachMs)
  try {
    return await work(browser)
  } finally {
    await browser.close()
  }
}

export const readTabs = (profile: string) => using(profile, async browser => Promise.all((await pagesOf(browser)).map(page => tabOf(browser, page))))

export const closeOtherTabs = (profile: string) =>
  using(profile, async browser => {
    const pages = await pagesOf(browser)
    const kept = pages.find(page => page.url === 'about:blank') ?? pages[0]
    for (const page of pages) if (page !== kept) await browser.call('Target.closeTarget', { targetId: page.targetId })
  })
