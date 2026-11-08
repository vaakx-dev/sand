import type { Spaces } from '@sand/layout/contract'
import type { Settings } from '@sand/settings/contract'
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { type Browser, chromium, type Page } from 'playwright'
import type { FeatureState } from '../../src/contract'
import { startSandbox } from './sandbox'

declare global {
  interface Window {
    sand: {
      scopes(): { kind: string; name: string; status: string }[]
      settled(): Promise<void>
      get<T>(token: { id: string }): T | undefined
    }
  }
}

interface Combo {
  name: string
  off: string[]
  spaces: string[]
  pages?: string[]
  absent?: string[]
  exact?: boolean
}

const topLevel = ['threads', 'bots', 'calendar', 'computers', 'pcs', 'notifications', 'mcp-server', 'updates']

const kernelPages = ['Features', 'Plugins']

const alone = (id: string, spaces: string[], pages: string[] = []): Combo => ({
  name: `only ${id}`,
  off: topLevel.filter(other => other !== id),
  spaces,
  pages: [...kernelPages, ...pages],
  exact: !pages.length,
})

const combos: Combo[] = [
  { name: 'kernel only', off: topLevel, spaces: [], pages: kernelPages, exact: true },
  alone('threads', ['Threads'], ['Models', 'Projects']),
  alone('bots', [], ['Models', 'Approvals']),
  alone('calendar', ['Calendar'], ['Connections']),
  alone('computers', [], ['Models']),
  alone('pcs', [], ['Devices']),
  alone('notifications', [], ['Notifications']),
  alone('mcp-server', []),
  alone('updates', [], ['Updates']),
  { name: 'threads without git', off: [...topLevel.filter(id => id !== 'threads'), 'git'], spaces: ['Threads'] },
  { name: 'bots without notifications, schedules and connections', off: [...topLevel.filter(id => id !== 'bots'), 'schedules', 'connections'], spaces: [], absent: ['Notifications', 'Connections'] },
  { name: 'bots without approvals', off: [...topLevel.filter(id => id !== 'bots'), 'approvals'], spaces: [], absent: ['Approvals'] },
]

const withModel = '[features]\n\n[[plugins.replay.sources]]\nid = "replay"\nmodels = ["script"]\nreplies = []\n'

const together = 3
let running = 0
const waiting: (() => void)[] = []

const slot = async () => {
  if (running >= together) await new Promise<void>(resolve => waiting.push(resolve))
  running++
  return () => {
    running--
    waiting.shift()?.()
  }
}

let browser: Browser

beforeAll(async () => {
  browser = await chromium.launch()
})

afterAll(() => browser?.close())

const settle = async (page: Page) => {
  await page.waitForFunction(() => window.sand?.get<FeatureState>({ id: 'featureState' })?.on('threads') !== undefined, undefined, { timeout: 30_000 })
  await page.evaluate(() => window.sand.settled())
  await Bun.sleep(1000)
}

const stuck = (page: Page) =>
  page.evaluate(() =>
    window.sand
      .scopes()
      .filter(scope => scope.kind === 'plugin' && (scope.status === 'failed' || scope.status === 'pending'))
      .map(scope => `${scope.name} ${scope.status}`),
  )

const shown = (page: Page) =>
  page.evaluate(() => ({
    spaces: window.sand.get<Spaces>({ id: 'spaces' })?.list().map(space => space.label) ?? [],
    pages: window.sand.get<Settings>({ id: 'settings' })?.pages().map(found => found.label) ?? [],
  }))

const visitAll = async (page: Page) => {
  const ids = await page.evaluate(() => ({
    spaces: window.sand.get<Spaces>({ id: 'spaces' })?.list().map(space => space.id) ?? [],
    pages: window.sand.get<Settings>({ id: 'settings' })?.pages().map(found => found.id) ?? [],
  }))
  for (const id of ids.spaces) {
    await page.evaluate(space => window.sand.get<Spaces>({ id: 'spaces' })?.open(space), id)
    await Bun.sleep(400)
  }
  for (const id of ids.pages) {
    await page.evaluate(found => window.sand.get<Settings>({ id: 'settings' })?.open(found), id)
    await Bun.sleep(400)
  }
  await page.evaluate(() => window.sand.get<Settings>({ id: 'settings' })?.close())
}

const logProblems = (log: string) => log.split(/\r?\n/).filter(line => /error|did not load|waiting for|nothing answers/i.test(line))

for (const combo of combos)
  test.concurrent(
    combo.name,
    async () => {
      const release = await slot()
      const sand = await startSandbox(`[features]\n${combo.off.map(id => `${id} = false`).join('\n')}\n`)
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
      try {
        const pairing = await context.newPage()
        await pairing.goto(sand.url)
        await settle(pairing)
        await pairing.close()

        const page = await context.newPage()
        const errors: string[] = []
        page.on('console', message => message.type() === 'error' && errors.push(message.text()))
        page.on('pageerror', error => errors.push(error.message))
        await page.goto(new URL('/', sand.url).href)
        await settle(page)

        const { spaces, pages } = await shown(page)
        expect(spaces).toEqual(combo.spaces)
        for (const label of combo.pages ?? []) expect(pages).toContain(label)
        for (const label of combo.absent ?? []) expect(pages).not.toContain(label)
        if (combo.exact) expect(pages.toSorted()).toEqual(combo.pages?.toSorted() ?? [])

        await visitAll(page)
        if (!combo.spaces.length) {
          await page.getByText('Nothing here yet').waitFor()
          await page.setViewportSize({ width: 390, height: 844 })
          await page.getByText('Nothing here yet').waitFor()
          await page.getByRole('navigation', { name: 'Spaces' }).waitFor()
        }
        await Bun.sleep(500)

        expect(await stuck(page)).toEqual([])
        expect(errors).toEqual([])
        expect(logProblems(await sand.log())).toEqual([])
      } finally {
        await context.close()
        await sand.stop()
        release()
      }
    },
    180_000,
  )

test.concurrent(
  'turning a feature off reloads the page without errors from the old one',
  async () => {
    const release = await slot()
    const sand = await startSandbox(withModel)
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    try {
      const page = await context.newPage()
      const errors: string[] = []
      page.on('console', message => message.type() === 'error' && errors.push(message.text()))
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(sand.url)
      await settle(page)
      await page.evaluate(() => window.sand.get<Settings>({ id: 'settings' })?.open('features'))
      await page.getByRole('switch', { name: 'Threads', exact: true }).click()
      const reloaded = page.waitForEvent('load', { timeout: 60_000 })
      await page.getByRole('button', { name: 'Turn off' }).click()
      await reloaded
      await settle(page)

      expect((await shown(page)).spaces).not.toContain('Threads')
      expect(errors).toEqual([])
      expect(logProblems(await sand.log())).toEqual([])
    } finally {
      await context.close()
      await sand.stop()
      release()
    }
  },
  180_000,
)
