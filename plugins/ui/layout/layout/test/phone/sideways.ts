import { afterAll, beforeAll, expect, test } from 'bun:test'
import type { Browser, Page } from 'playwright'
import { startSandbox } from './sand'
import { openPhone, phoneBrowser, phones, send } from './touch'

const unbroken = 'x'.repeat(300)
const reply = [
  'Wide content:',
  '',
  `https://example.com/report?${unbroken}`,
  '',
  `\`${unbroken}\``,
  '',
  '| Item | Before | After |',
  '| --- | --- | --- |',
  `| ${unbroken} | 12 Sample St, Springfield | 34 Example Rd, Shelbyville |`,
].join('\n')

let sand: Awaited<ReturnType<typeof startSandbox>>
let browser: Browser
let page: Page

const shift = () =>
  page.evaluate(() => ({
    stage: document.querySelector('#stage')!.scrollLeft,
    nav: Math.round(document.querySelector('nav')!.getBoundingClientRect().left),
  }))

const reveal = (selector: string) =>
  page.evaluate(found => {
    for (const el of document.querySelectorAll(found)) el.scrollIntoView({ inline: 'end' })
  }, selector)

beforeAll(async () => {
  sand = await startSandbox([reply])
  const phone = await phoneBrowser()
  browser = phone.browser
  ;({ page } = await openPhone(phone.context, sand.url, phones[0]!))
  await send(page, 'show me', 'Wide content:')
}, 60_000)

afterAll(async () => {
  await browser?.close()
  await sand?.stop()
})

test('wide message content never scrolls the page sideways', async () => {
  await reveal('table, code, p')
  expect(await shift()).toEqual({ stage: 0, nav: 0 })
})

test('a view wider than the screen is clipped, not scrolled into', async () => {
  await page.evaluate(`document.querySelector('.isolate').insertAdjacentHTML('beforeend', '<div id="too-wide" style="width: 1200px">too wide</div>')`)
  await reveal('#too-wide')
  expect(await shift()).toEqual({ stage: 0, nav: 0 })
})
