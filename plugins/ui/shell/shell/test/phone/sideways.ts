import { afterAll, beforeAll, expect, test } from 'bun:test'
import type { Browser, Page } from 'playwright'
import { startSandbox } from './sand'
import { openAt, phones, touchBrowser } from './touch'

let sand: Awaited<ReturnType<typeof startSandbox>>
let browser: Browser
let page: Page

const shift = () =>
  page.evaluate(() => ({
    stage: document.querySelector('#stage')!.scrollLeft,
    header: Math.round([...document.querySelectorAll('header')].findLast(node => node.checkVisibility())!.getBoundingClientRect().left),
  }))

const reveal = (selector: string) =>
  page.evaluate(found => {
    for (const el of document.querySelectorAll(found)) el.scrollIntoView({ inline: 'end' })
  }, selector)

beforeAll(async () => {
  sand = await startSandbox()
  const phone = await touchBrowser()
  browser = phone.browser
  ;({ page } = await openAt(phone.context, sand.url, phones[0]!))
  await page.getByRole('button', { name: /Plain screen/ }).click()
  await page.getByText('Fixture plain').waitFor()
  await Bun.sleep(600)
}, 60_000)

afterAll(async () => {
  await browser?.close()
  await sand?.stop()
})

test('wide content never scrolls the page sideways', async () => {
  await reveal('table, p')
  expect(await shift()).toEqual({ stage: 0, header: 0 })
})

test('a view wider than the screen is clipped, not scrolled into', async () => {
  await page.evaluate(`[...document.querySelectorAll('header')].findLast(node => node.checkVisibility()).parentElement.insertAdjacentHTML('beforeend', '<div id="too-wide" style="width: 1200px">too wide</div>')`)
  await reveal('#too-wide')
  expect(await shift()).toEqual({ stage: 0, header: 0 })
})
