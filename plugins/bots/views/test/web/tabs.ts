import { afterAll, beforeAll, expect, test } from 'bun:test'
import { chromium, type Browser, type Page } from 'playwright'
import { openBot, startSandbox } from './sandbox'

interface Seeded {
  idle: string
  worker: string
  reminder: string
}

const seed = {
  imports: `import { bots } from '@sand/bots/contract'
import { schedules } from '@sand/schedules/contract'`,
  inject: 'bots, schedules',
  body: `const idle = ctx.bots.create({ name: 'Idle' })
    const worker = ctx.bots.create({ name: 'Worker' })
    ctx.bots.jobs.create(worker.id, { title: 'Morning CI triage', goal: 'Keep CI green', done: 'Every failure has an owner' })
    const reminder = ctx.bots.create({ name: 'Reminder' })
    ctx.schedules.create({ owner: 'routines', subject: reminder.id, when: { kind: 'cron', cron: '0 9 * * 1-5', zone: 'UTC' }, data: { name: 'Water the plants', instructions: 'Remind me to water the plants' } })
    return { idle: idle.id, worker: worker.id, reminder: reminder.id }`,
}

let sand: Awaited<ReturnType<typeof startSandbox<Seeded>>>
let browser: Browser
let page: Page

const tabs = () => page.getByRole('radiogroup', { name: 'View' })

beforeAll(async () => {
  sand = await startSandbox<Seeded>(seed)
  browser = await chromium.launch()
  page = await (await browser.newContext({ serviceWorkers: 'block' })).newPage()
  await page.goto(sand.url)
  await page.getByRole('button', { name: 'New thread' }).first().waitFor()
}, 60_000)

afterAll(async () => {
  await browser?.close()
  await sand?.stop()
})

test('a bot with no jobs or routines shows its chat with no Jobs tab', async () => {
  await openBot(page, sand.seeded.idle)
  await page.getByRole('textbox').first().waitFor()
  expect(await tabs().count()).toBe(0)
}, 30_000)

test('a bot with a job opens on its jobs, with a tab to its chat', async () => {
  await openBot(page, sand.seeded.worker)
  await page.getByText('Morning CI triage').first().waitFor()
  await tabs().getByRole('radio', { name: 'Chat' }).waitFor()
}, 30_000)

test('a bot with only a routine has a Jobs tab that lists it', async () => {
  await openBot(page, sand.seeded.reminder)
  await tabs().getByRole('radio', { name: 'Jobs' }).click()
  await page.getByText('Water the plants').first().waitFor()
}, 30_000)
