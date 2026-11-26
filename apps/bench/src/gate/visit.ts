import type { Page } from 'playwright'
import { type LinkShape, slowLink } from '../link'
import { type Cost, costOf, countAt, fresh, openRoute, seen, shownAt, tapped } from '../measure'
import { COMPOSER, startPhone } from '../phone'
import { type Sandbox, startSandbox } from '../sandbox'
import type { SeededChat } from '../seed/chat'
import type { Tree } from './row'

interface Opened {
  cost: Cost
  shownMs: number
}

interface Sent {
  cost: Cost
  shownMs: number
  repliedMs: number
}

const PHONE: LinkShape = { rttMs: 150, downKbps: 9000, upKbps: 1500 }

const CPU_SLOWDOWN = 4

const PAIR_TIMEOUT_MS = 60_000

const QUIET_MS = 2000

const QUIET_POLL_MS = 100

const QUIET_LIMIT_MS = 5000

const end = (chat: SeededChat) => `End-${chat.marker}`

class Visit {
  readonly short: SeededChat[]
  readonly long: SeededChat[]

  private constructor(
    readonly tree: Tree,
    private readonly sandbox: Sandbox,
    private readonly link: Awaited<ReturnType<typeof slowLink>>,
    private readonly phone: Awaited<ReturnType<typeof startPhone>>,
  ) {
    this.short = sandbox.seeded.threads.filter(chat => !chat.long)
    this.long = sandbox.seeded.threads.filter(chat => chat.long)
  }

  static async open(tree: Tree, replies: number) {
    const sandbox = await startSandbox({ replies, sand: tree.sand })
    const link = await slowLink(new URL(sandbox.pairUrl), PHONE)
    const phone = await startPhone({ cpuSlowdown: CPU_SLOWDOWN })
    const visit = new Visit(tree, sandbox, link, phone)
    await visit.#pair().catch(async (error: unknown) => {
      await visit.close()
      throw error
    })
    return visit
  }

  get home() {
    return this.short[0]!
  }

  #at(path: string) {
    return `${this.link.origin}${path}`
  }

  #chatUrl(chat: SeededChat) {
    return this.#at(`/?view=thread&id=${chat.id}`)
  }

  async #pair() {
    const page = await this.phone.page(1)
    await page.goto(this.#at(`/${new URL(this.sandbox.pairUrl).hash}`))
    await page.getByRole('button', { name: 'Show the sidebar' }).first().waitFor({ timeout: PAIR_TIMEOUT_MS })
    await page.goto(this.#chatUrl(this.home))
    await shownAt(page, end(this.home), true)
    await page.close()
  }

  #moved() {
    return this.link.traffic.up + this.link.traffic.down
  }

  async #quiet() {
    const limit = performance.now() + QUIET_LIMIT_MS
    let moved = this.#moved()
    let still = 0
    while (still < QUIET_MS && performance.now() < limit) {
      await Bun.sleep(QUIET_POLL_MS)
      still = this.#moved() === moved ? still + QUIET_POLL_MS : 0
      moved = this.#moved()
    }
  }

  async tab() {
    const page = await this.phone.page()
    await page.goto(this.#chatUrl(this.home))
    await shownAt(page, end(this.home), true)
    return page
  }

  async measure(page: Page, act: () => Promise<number>, done: (start: number) => Promise<number>) {
    await this.#quiet()
    const since = await seen(page, this.link.traffic)
    const start = await act()
    return costOf(page, this.link.traffic, since, start, await done(start))
  }

  async open(page: Page, chat: SeededChat): Promise<Opened> {
    let shownMs = 0
    const cost = await this.measure(
      page,
      () => openRoute(page, 'thread', chat.id),
      async start => {
        shownMs = (await shownAt(page, end(chat))) - start
        return shownAt(page, end(chat), true)
      },
    )
    return { cost, shownMs }
  }

  async send(page: Page, text: string): Promise<Sent> {
    await page.locator(COMPOSER).first().fill(text)
    const [replies, ends] = await page.evaluate(() => [window.bench.count('Bench reply'), window.bench.count('ends reply')])
    await this.#quiet()
    const since = await seen(page, this.link.traffic)
    await page.getByRole('button', { name: 'Send', exact: true }).first().click()
    const start = await tapped(page)
    const shownMs = (await shownAt(page, text)) - start
    const repliedMs = (await countAt(page, 'Bench reply', replies!)) - start
    const cost = await costOf(page, this.link.traffic, since, start, await countAt(page, 'ends reply', ends!))
    return { cost, shownMs, repliedMs }
  }

  async firstVisit(): Promise<Opened> {
    const empty = await startPhone({ cpuSlowdown: CPU_SLOWDOWN })
    try {
      const page = await empty.page()
      const paired = new URL(await this.sandbox.pairAgain())
      await this.#quiet()
      const since = fresh(this.link.traffic)
      await page.goto(`${this.#chatUrl(this.home)}${paired.hash}`, { waitUntil: 'commit' })
      const shownMs = await shownAt(page, end(this.home))
      const cost = await costOf(page, this.link.traffic, since, 0, await shownAt(page, end(this.home), true))
      return { cost, shownMs }
    } finally {
      await empty.close()
    }
  }

  async idle(pages: Page[], windowMs: number) {
    await this.#quiet()
    const marks = await Promise.all(pages.map(async page => ({ page, since: await seen(page, this.link.traffic), start: await page.evaluate(() => performance.now()) })))
    await Bun.sleep(windowMs)
    return Promise.all(marks.map(({ page, since, start }) => costOf(page, this.link.traffic, since, start, start + windowMs)))
  }

  async close() {
    await this.phone.close()
    this.link.close()
    await this.sandbox.stop()
  }
}

export { Visit }
