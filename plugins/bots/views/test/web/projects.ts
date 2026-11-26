import { afterAll, beforeAll, expect, test } from 'bun:test'
import { chromium, type Browser, type Locator, type Page } from 'playwright'
import { openBot, startSandbox } from './sandbox'

interface Seeded {
  bot: string
}

const seed = {
  imports: `import { bots } from '@sand/bots/contract'
import { hostChannel } from '@sand/host-runtimes/contract'
import { runtimeProjectCreate } from '@sand/project/contract'`,
  inject: 'bots, hostChannel',
  body: `const project = async (name, branch) => {
      const folder = join(ctx.paths.home, 'code', name)
      mkdirSync(folder, { recursive: true })
      Bun.spawnSync(['git', 'init', '-q', '-b', branch], { cwd: folder })
      writeFileSync(join(folder, name + '-notes.md'), 'draft')
      return (await ctx.hostChannel.call(runtimeProjectCreate, { folder, name })).project
    }
    const projects = [await project('harbor', 'tide-retry'), await project('ledger', 'refund-webhook')]
    return { bot: ctx.bots.create({ name: 'Atlas', projects }).id }`,
}

let sand: Awaited<ReturnType<typeof startSandbox<Seeded>>>
let browser: Browser
let page: Page

const aside = (label: string) => page.locator(`div[aria-label="${label}"]`)

const open = async (label: string) => {
  const toggle = page.getByRole('button', { name: label, exact: true }).first()
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click()
}

const switchTo = async (where: Locator, project: string) => {
  await where.getByRole('button', { name: 'Project' }).click()
  await where.getByRole('menuitemradio', { name: project }).click()
}

const folderLine = (project: string) => aside('Terminal').locator('.xterm-rows').getByText(new RegExp(`code[\\\\/]${project}`))

const shellIn = async (project: string) => {
  await aside('Terminal').locator('.xterm').click()
  await page.keyboard.type('pwd\r')
  await folderLine(project).first().waitFor()
}

beforeAll(async () => {
  sand = await startSandbox<Seeded>(seed, ['git', 'terminal'])
  browser = await chromium.launch()
  page = await (await browser.newContext({ viewport: { width: 1400, height: 900 }, serviceWorkers: 'block' })).newPage()
  await page.goto(sand.url)
  await page.getByRole('button', { name: 'New thread' }).first().waitFor()
  await openBot(page, sand.seeded.bot)
}, 60_000)

afterAll(async () => {
  await browser?.close()
  await sand?.stop()
})

test("picking a bot's project moves its Changes, Details and Terminal to that project", async () => {
  await open('Side panel')
  const panel = aside('Side panel')
  await panel.getByRole('tab', { name: 'Changes' }).click()
  await panel.getByText('harbor-notes.md').waitFor()
  await switchTo(panel, 'ledger')
  await panel.getByText('ledger-notes.md').waitFor()
  expect(await panel.getByText('harbor-notes.md').count()).toBe(0)

  await open('Details')
  const details = aside('Details')
  await details.getByText('refund-webhook').waitFor()
  await switchTo(details, 'harbor')
  await details.getByText('tide-retry').waitFor()

  await open('Terminal')
  await shellIn('harbor')
  await switchTo(aside('Terminal'), 'ledger')
  await shellIn('ledger')
  expect(await folderLine('harbor').count()).toBe(0)
}, 60_000)
