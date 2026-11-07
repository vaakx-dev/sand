import { findBrowser, launch, type Browser } from '@sand/cdp'
import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readTabs } from '../bench/browser'
import { serveSite, tasks, type Seen } from '../bench/tasks'

const form = tasks.find(task => task.id === 'form')!
const profile = mkdtempSync(join(tmpdir(), 'sand-bench-test-'))
const site = serveSite()
let browser: Browser
let page: (expression: string) => Promise<unknown>

const seen = async (): Promise<Seen> => ({ answer: '', tabs: await readTabs(profile), elements: [], judge: () => Promise.reject(new Error('no judge')) })

const settle = async (path: string) => {
  for (let tries = 0; tries < 100; tries++) {
    const { tabs } = await seen()
    if (tabs.some(tab => tab.url.includes(path))) return
    await Bun.sleep(50)
  }
  throw new Error(`the page never reached ${path}`)
}

describe.skipIf(!(await findBrowser()))('bench checks on a real browser', () => {
  beforeAll(async () => {
    browser = await launch({ executable: (await findBrowser())!, profile, args: ['--headless=new', 'about:blank'], deadline: Date.now() + 20_000 })
    const { targetInfos } = await browser.call<{ targetInfos: { targetId: string; type: string }[] }>('Target.getTargets')
    const { sessionId } = await browser.call<{ sessionId: string }>('Target.attachToTarget', { targetId: targetInfos.find(target => target.type === 'page')!.targetId, flatten: true })
    page = expression => browser.call('Runtime.evaluate', { expression, awaitPromise: true }, sessionId)
    await browser.call('Page.navigate', { url: `${site.url.origin}/form/` }, sessionId)
    await settle('/form/')
  })

  afterAll(async () => {
    await browser.close()
    await site.stop(true)
    rmSync(profile, { recursive: true, force: true })
  })

  test('the form task passes only with every field right and the form not sent', async () => {
    await page(`Object.assign(document.querySelector('#name'), { value: 'Ada Lovelace' })
      Object.assign(document.querySelector('#email'), { value: 'ada@example.org' })
      Object.assign(document.querySelector('#topic'), { value: 'bug' })
      Object.assign(document.querySelector('#message'), { value: 'The export button does nothing.' })`)
    expect(await form.check(await seen())).toMatchObject({ pass: false, why: expect.stringContaining('newsletter=true') })
    await page(`document.querySelector('[name=newsletter]').checked = false`)
    expect(await form.check(await seen())).toMatchObject({ pass: true })
    await page(`document.querySelector('form').submit()`)
    await settle('/form/sent')
    expect(await form.check(await seen())).toMatchObject({ pass: false, why: expect.stringContaining('sent the form') })
  })
})
