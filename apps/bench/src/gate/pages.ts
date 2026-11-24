import type { Page } from 'playwright'
import { type Cost, openRoute, shownAt } from '../measure'
import { interleave, repeated, type Row, type Run, type Runs, type Suite, type Tree, wire } from './row'
import { allOrNone } from './together'
import { Visit } from './visit'

interface Screen {
  name: string
  route?: { kind: string; id?: string }
  shows: string
}

const SCREENS: Screen[] = [
  { name: 'Settings', route: { kind: 'settings' }, shows: 'Accounts and devices' },
  { name: 'Add-ons', route: { kind: 'settings', id: 'features' }, shows: 'Installed' },
  { name: 'Usage', route: { kind: 'usage' }, shows: 'Spend' },
  { name: 'Search', shows: 'Tutor 1' },
  { name: 'Performance', route: { kind: 'usage', id: 'performance' }, shows: 'Memory used' },
]

const LEFT_OPEN_MS = 20_000

const MINUTE_MS = 60_000

const opened = (screen: Screen) => `open ${screen.name}`

const leftOpen = (screen: Screen) => `${screen.name} left open`

const perMinute = (cost?: Cost) => cost && ((cost.plainDown + cost.plainUp + cost.pushBytes) * MINUTE_MS) / cost.ms

const rows: Row[] = SCREENS.flatMap(screen => [
  { name: `${screen.name}: time to open`, unit: 'ms', rule: 'timing', read: run => run.costs.get(opened(screen))?.ms },
  { name: `${screen.name}: data to open`, unit: 'bytes', rule: 'exact', read: run => wire(run.costs.get(opened(screen))) },
  { name: `${screen.name}: data per minute left open`, unit: 'bytes', rule: 'timing', read: run => perMinute(run.costs.get(leftOpen(screen))) },
])

const show = (page: Page, { route }: Screen) =>
  route
    ? openRoute(page, route.kind, route.id ?? '')
    : page.evaluate(() => {
        const start = performance.now()
        const app = (window as unknown as { sand: { get(token: { id: string }): { open(): void } } }).sand
        app.get({ id: 'palette' }).open()
        return start
      })

const hide = (page: Page, screen: Screen) => (screen.route ? Promise.resolve() : page.keyboard.press('Escape'))

const round = async (visit: Visit, run: Run) => {
  const page = await visit.tab()
  for (const screen of SCREENS) {
    run.costs.set(opened(screen), await visit.measure(page, () => show(page, screen), () => shownAt(page, screen.shows)))
    await hide(page, screen)
  }
  await page.close()
}

const leaveOpen = async (visit: Visit, run: Run) => {
  const tabs = await Promise.all(
    SCREENS.map(async screen => {
      const page = await visit.tab()
      await show(page, screen)
      await shownAt(page, screen.shows)
      return { screen, page }
    }),
  )
  const costs = await visit.idle(
    tabs.map(({ page }) => page),
    LEFT_OPEN_MS,
  )
  tabs.forEach(({ screen }, index) => run.costs.set(leftOpen(screen), costs[index]!))
  await Promise.all(tabs.map(({ page }) => page.close()))
}

const measure = async (trees: Tree[], runs: Runs, rounds: number) => {
  const visits = await allOrNone(trees.map(tree => Visit.open(tree, 0)), visit => visit.close())
  try {
    await interleave(repeated(visits, rounds), visit => round(visit, runs.add(visit.tree)))
    for (let index = 0; index < rounds; index++) await Promise.all(visits.map(visit => leaveOpen(visit, runs.add(visit.tree))))
  } finally {
    await Promise.all(visits.map(visit => visit.close()))
  }
}

const pages: Suite = { group: 'Main pages (same phone and link)', rows, measure }

export { pages }
