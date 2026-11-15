import { ordered, type Row, type Run, type Runs, type Suite, type Tree, wire } from './row'
import { allOrNone } from './together'
import { Visit } from './visit'

const IDLE_MS = 20_000

const REPLIES_PER_SEND = 3

const STEPS = ['open a chat', 'open a long chat', 'send', 'first visit']

const blocked = (run: Run) => {
  const costs = STEPS.flatMap(step => run.costs.get(step) ?? [])
  return costs.length === STEPS.length ? costs.reduce((sum, cost) => sum + cost.blockedMs, 0) : undefined
}

const rows: Row[] = [
  { name: 'open a chat: shows', unit: 'ms', rule: 'timing', read: run => run.marks.get('open a chat: shows') },
  { name: 'open a chat: usable', unit: 'ms', rule: 'timing', read: run => run.costs.get('open a chat')?.ms },
  { name: 'first visit with an empty cache: usable', unit: 'ms', rule: 'timing', read: run => run.costs.get('first visit')?.ms },
  { name: 'open a long chat: usable', unit: 'ms', rule: 'timing', read: run => run.costs.get('open a long chat')?.ms },
  { name: 'send: your message shows', unit: 'ms', rule: 'timing', read: run => run.marks.get('send: message shows') },
  { name: 'send: first reply text shows', unit: 'ms', rule: 'timing', read: run => run.marks.get('send: first reply shows') },
  { name: 'main thread blocked over these steps', unit: 'ms', rule: 'timing', read: blocked },
  { name: 'data on first visit', unit: 'bytes', rule: 'exact', read: run => wire(run.costs.get('first visit')) },
  { name: 'data per chat opened', unit: 'bytes', rule: 'exact', read: run => wire(run.costs.get('open a chat')) },
  { name: `data while idle for ${IDLE_MS / 1000} s`, unit: 'bytes', rule: 'exact', read: run => wire(run.costs.get('idle')) },
  { name: 'app code a phone downloads', unit: 'bytes', rule: 'exact', read: run => run.costs.get('first visit')?.codeBytes },
]

const round = async (visit: Visit, index: number, run: Run) => {
  const page = await visit.tab()
  const chat = await visit.open(page, visit.short[1 + index]!)
  run.costs.set('open a chat', chat.cost)
  run.marks.set('open a chat: shows', chat.shownMs)
  run.costs.set('open a long chat', (await visit.open(page, visit.long[index % visit.long.length]!)).cost)
  const sent = await visit.send(page, `Bench message ${index}`)
  run.costs.set('send', sent.cost)
  run.marks.set('send: message shows', sent.shownMs)
  run.marks.set('send: first reply shows', sent.repliedMs)
  await page.close()
  run.costs.set('first visit', (await visit.firstVisit()).cost)
}

const idle = async (visit: Visit, run: Run) => {
  const page = await visit.tab()
  const [cost] = await visit.idle([page], IDLE_MS)
  if (cost) run.costs.set('idle', cost)
  await page.close()
}

const measure = async (trees: Tree[], runs: Runs, rounds: number) => {
  const visits = await allOrNone(trees.map(tree => Visit.open(tree, rounds * REPLIES_PER_SEND)), visit => visit.close())
  try {
    for (let index = 0; index < rounds; index++) {
      for (const visit of ordered(visits, index)) await round(visit, index, runs.add(visit.tree))
      await Promise.all(visits.map(visit => idle(visit, runs.add(visit.tree))))
    }
  } finally {
    await Promise.all(visits.map(visit => visit.close()))
  }
}

const phone: Suite = { group: 'Phone (4× slower CPU, 150 ms, 9 Mbit/s link)', rows, measure }

export { phone }
