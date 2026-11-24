import { afterAll, beforeAll, expect, test } from 'bun:test'
import { chromium, type Browser } from 'playwright'
import { openBot, startSandbox } from './sandbox'

const turns = 12
const steps = 30

const seed = {
  imports: `import { bots } from '@sand/bots/contract'
import { sessions } from '@sand/chats/contract'`,
  inject: 'bots, sessions',
  body: `const bot = ctx.bots.create({ name: 'Worker' })
    const chat = ctx.sessions.require(bot.id)
    let at = Date.now() - 86_400_000
    for (let turn = 0; turn < ${turns}; turn++) {
      chat.append('message', { role: 'user', content: [{ type: 'text', text: 'Do task ' + turn }] }, { at })
      for (let step = 0; step < ${steps}; step++) {
        const id = 'call-' + turn + '-' + step
        chat.append('message', { role: 'assistant', content: [{ type: 'tool_call', id, name: 'shell', input: { command: 'ls' } }] }, { at: ++at })
        chat.append('message', { role: 'user', content: [{ type: 'tool_result', callId: id, content: [{ type: 'text', text: 'out' }] }] }, { at: ++at })
      }
      chat.append('message', { role: 'assistant', content: [{ type: 'text', text: 'Done task ' + turn }] }, { at: ++at })
      at += 60_000
    }
    return { bot: bot.id }`,
}

let sand: Awaited<ReturnType<typeof startSandbox<{ bot: string }>>>
let browser: Browser

beforeAll(async () => {
  sand = await startSandbox<{ bot: string }>(seed)
  browser = await chromium.launch()
}, 60_000)

afterAll(async () => {
  await browser?.close()
  await sand?.stop()
})

test('a bot chat whose newest page shows one reply loads its whole history as you scroll up', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, serviceWorkers: 'block' })
  const page = await context.newPage()
  await page.goto(sand.url)
  await page.getByRole('button', { name: 'Show the sidebar' }).first().waitFor()
  await openBot(page, sand.seeded.bot)
  await page.getByText(`Done task ${turns - 1}`).waitFor()
  const first = page.getByText('Do task 0', { exact: true })
  for (let tries = 0; tries < 100 && !(await first.isVisible()); tries++) {
    await page.evaluate(() => {
      let scroller = [...document.querySelectorAll('p')].find(node => node.textContent?.startsWith('Done task') && node.checkVisibility())?.parentElement
      while (scroller && getComputedStyle(scroller).overflowY !== 'auto') scroller = scroller.parentElement
      if (scroller) scroller.scrollTop -= scroller.clientHeight
    })
    await Bun.sleep(150)
  }
  expect(await first.isVisible()).toBe(true)
  await context.close()
}, 60_000)
