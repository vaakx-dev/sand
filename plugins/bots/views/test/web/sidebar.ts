import { afterAll, beforeAll, expect, test } from 'bun:test'
import { chromium, type Browser, type Page } from 'playwright'
import { startSandbox } from './sandbox'

const seed = {
  imports: `import { bots } from '@sand/bots/contract'
import { sessions } from '@sand/chats/contract'
import { backgroundJobs } from '@sand/jobs/contract'`,
  inject: 'bots, sessions, backgroundJobs',
  body: `ctx.bots.create({ name: 'Scout' })
    const projects = ctx.bots.folders.create('Projects')
    ctx.bots.folders.create('Life')
    const harbor = ctx.bots.create({ name: 'Harbor' })
    const ledger = ctx.bots.create({ name: 'Ledger' })
    ctx.bots.move(harbor.id, projects.id)
    ctx.bots.move(ledger.id, projects.id)
    const parent = ctx.sessions.require(harbor.id)
    ctx.backgroundJobs.start({
      parent,
      label: 'Watch the tides',
      command: 'tail -f tides.log',
      cwd: parent.cwd,
      work: signal => new Promise(resolve => signal.addEventListener('abort', () => resolve('stopped'))),
      outlives: () => false,
      read: () => '',
      output: () => '',
    })
    return {}`,
}

let sand: Awaited<ReturnType<typeof startSandbox<object>>>
let browser: Browser
let page: Page

const heading = (name: string) => page.locator('button[aria-expanded]', { hasText: name })

const folder = (name: string) => heading(name).locator('xpath=..')

beforeAll(async () => {
  sand = await startSandbox<object>(seed)
  browser = await chromium.launch()
  page = await (await browser.newContext({ viewport: { width: 1400, height: 900 }, serviceWorkers: 'block' })).newPage()
  await page.goto(sand.url)
  await heading('Projects').waitFor()
}, 60_000)

afterAll(async () => {
  await browser?.close()
  await sand?.stop()
})

test('a bot running a job stays in its folder with its job count, and bots have no Working group', async () => {
  await folder('Projects').getByText('1 job working').waitFor()
  expect(await folder('Projects').textContent()).toContain('Harbor')
  expect(await folder('Life').textContent()).toContain('Long-press a bot to move it here.')
  expect(await page.getByRole('heading', { name: 'Working' }).count()).toBe(0)
}, 30_000)

test('a folder folds on this device, shows how many of its bots work while folded, and stays folded after a reload', async () => {
  await heading('Projects').click()
  expect(await heading('Projects').getAttribute('aria-expanded')).toBe('false')
  await heading('Projects').getByText('1 working').waitFor()
  expect(await folder('Projects').textContent()).not.toContain('Harbor')

  await page.reload()
  await heading('Projects').waitFor()
  expect(await heading('Projects').getAttribute('aria-expanded')).toBe('false')

  await heading('Projects').click()
  await folder('Projects').getByText('Harbor').waitFor()
  expect(await heading('Projects').getByText('1 working').count()).toBe(0)
}, 30_000)
