import { afterAll, beforeAll, test } from 'bun:test'
import { chromium, type Browser } from 'playwright'
import { newChat, startSandbox } from './sandbox'

let sand: Awaited<ReturnType<typeof startSandbox>>
let browser: Browser

beforeAll(async () => {
  sand = await startSandbox([{ text: 'Hello from the thread' }])
  browser = await chromium.launch()
}, 60_000)

afterAll(async () => {
  await browser?.close()
  await sand?.stop()
})

test('a message typed while the page catches up stays, and sends once it has', async () => {
  const page = await browser.newPage()
  const asked = Promise.withResolvers<void>()
  const greeted = Promise.withResolvers<void>()
  await page.routeWebSocket(/\/ws\b/, client => {
    const server = client.connectToServer()
    let hello: number | undefined
    client.onMessage(message => {
      const sent = JSON.parse(String(message)) as { type: string; id: number }
      if (sent.type === 'hello' && hello === undefined) {
        hello = sent.id
        asked.resolve()
      }
      server.send(message)
    })
    server.onMessage(message => {
      const answer = JSON.parse(String(message)) as { type: string; id?: number }
      if (answer.type !== 'result' || answer.id !== hello) return client.send(message)
      void greeted.promise.then(() => client.send(message))
    })
  })
  await page.goto(sand.url)
  await asked.promise
  await newChat(page)
  await page.getByRole('textbox').first().fill('hello')
  greeted.resolve()
  await page.getByRole('button', { name: 'Send' }).click({ timeout: 10_000 })
  await page.getByText('Hello from the thread').first().waitFor({ timeout: 10_000 })
  await page.close()
}, 60_000)
