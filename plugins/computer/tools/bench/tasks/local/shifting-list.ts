import { all, answered, type LocalTask, type Seen, type Verdict } from '../task'
import { digits, layout, shuffled } from './layout'

interface Message {
  id: number
  from: string
  subject: string
  time: string
  reference: string
}

const senders = shuffled(['Marta Kowalski', 'Devon Reyes', 'Priya Natarajan', 'Tomas Berg', 'Aiko Tanaka', 'Lena Fischer', 'Omar Haddad', 'Sofia Marino', 'Jonas Weber', 'Hannah Cole', 'Ravi Menon', 'Clara Dubois'])
const subjects = shuffled([
  'Invoice for March shipment',
  'Updated delivery schedule',
  'Contract renewal terms',
  'Team offsite logistics',
  'Your refund request',
  'Security review findings',
  'Quarterly budget draft',
  'Parking permit renewal',
  'Vendor onboarding checklist',
  'Conference travel booking',
])

const sender = senders[0]!
const namesake = senders[1]!
const others = senders.slice(2)
const subject = subjects[0]!
const twinSubject = subjects[1]!
const newSubject = subjects[2]!
const rest = subjects.slice(3)

const used = new Set<string>()
const reference = () => {
  for (;;) {
    const value = `RF-${digits(5)}`
    if (!used.has(value)) {
      used.add(value)
      return value
    }
  }
}

const times = ['9:42 am', '9:15 am', '8:58 am', '8:31 am', '8:02 am', 'Yesterday', 'Yesterday', 'Yesterday', 'Mon', 'Mon', 'Sun', 'Sun', 'Fri', 'Fri']

const stored: [string, string][] = [
  ...others.slice(0, 3).map((from, index): [string, string] => [from, rest[index]!]),
  [namesake, subject],
  [sender, subject],
  [sender, twinSubject],
  ...others.slice(3, 8).map((from, index): [string, string] => [from, rest[(index + 3) % rest.length]!]),
]

const messages: Message[] = stored.map(([from, title], index) => ({ id: 10 + index, from, subject: title, time: times[index]!, reference: reference() }))
const arrivals: Message[] = [
  { id: 101, from: others[8]!, subject: rest[0]!, time: 'Just now', reference: reference() },
  { id: 102, from: sender, subject: newSubject, time: 'Just now', reference: reference() },
]

const wanted = messages.find(message => message.from === sender && message.subject === subject)!

const known = [...arrivals, ...messages]

const state = `const key = 'shifting-list'
const state = JSON.parse(localStorage.getItem(key) ?? '{}')
state.archived ??= []
const save = () => localStorage.setItem(key, JSON.stringify(state))
const mirror = () => { document.getElementById('archived').value = state.archived.join(',') }
const banner = document.getElementById('banner')
setTimeout(() => { banner.style.height = '84px' }, 1500)`

const css = `<style>
#banner { height: 0; overflow: hidden; transition: height .25s; background: #fff3cd; } #banner a { display: block; padding: 28px 24px; color: #6b4e00; font-weight: 600; text-align: center; }
.row { display: flex; gap: 16px; align-items: center; height: 64px; box-sizing: border-box; padding: 0 16px; background: #fff; border-bottom: 1px solid #e1e4ea; color: inherit; text-decoration: none; }
.row b { width: 170px; flex: none; } .row span { flex: 1; } .row small { color: #6b7280; }
.row:hover { background: #eef3ff; }
</style>`

const header = '<header><b>Postbox</b><a href="/shifting-list/">Inbox</a></header><div id="banner"><a href="/shifting-list/promo">Postbox Premium: 50% off your first year. Learn more →</a></div>'

const hidden = '<input type="hidden" name="archived" id="archived" value="">'

const inbox = layout(
  'Inbox',
  `${css}${header}<main style="max-width:960px;padding-top:16px"><h1 style="margin:0 0 12px">Inbox</h1><div id="list"></div>${hidden}</main>`,
  `${state}
const arrivals = ${JSON.stringify(arrivals)}
const messages = ${JSON.stringify(messages)}
const list = document.getElementById('list')
const render = () => {
  const shown = [...(state.arrived ? arrivals : []), ...messages].filter(message => !state.archived.includes(message.id))
  list.innerHTML = shown.map(message => '<a class="row" href="/shifting-list/message/' + message.id + '"><b>' + message.from + '</b><span>' + message.subject + '</span><small>' + message.time + '</small></a>').join('')
}
const arrive = () => { state.arrived = true; save(); render() }
render()
mirror()
if (!state.arrived && state.clicked) setTimeout(arrive, 900)
if (!state.arrived && !state.clicked) addEventListener('click', () => { state.clicked = true; save(); setTimeout(arrive, 900) }, { once: true, capture: true })`,
)

const promo = layout(
  'Postbox Premium',
  `${css}${header}<main><h1>Postbox Premium</h1><p>Unlimited storage, priority support and scheduled sending.</p><p><a href="/shifting-list/">Back to the inbox</a></p>${hidden}</main>`,
  `${state}\nmirror()`,
)

const open = (id: number) => {
  const message = known.find(each => each.id === id)
  if (!message) return undefined
  return layout(
    message.subject,
    `${css}${header}<main style="max-width:960px"><p><a href="/shifting-list/">← Inbox</a></p><h1>${message.subject}</h1><p>From: ${message.from}</p>
<p>Hello, following up on the item below. Your reference number is ${message.reference}. Please keep it for any future correspondence.</p>
<div id="actions"></div>${hidden}</main>`,
    `${state}
const id = ${message.id}
const actions = document.getElementById('actions')
const show = () => {
  if (state.archived.includes(id)) {
    actions.innerHTML = '<p>Message archived. <a href="#" id="undo">Undo</a></p>'
    document.getElementById('undo').onclick = event => { event.preventDefault(); state.archived = state.archived.filter(each => each !== id); save(); mirror(); show() }
  } else {
    actions.innerHTML = '<button type="button" id="archive">Archive</button>'
    document.getElementById('archive').onclick = () => { state.archived.push(id); save(); mirror(); show() }
  }
}
show()
mirror()`,
  )
}

const archivedOnly = ({ tabs }: Seen): Verdict => {
  const tab = tabs.find(each => typeof each.fields.archived === 'string')
  if (!tab) return { pass: false, why: 'no inbox page is open' }
  const archived = String(tab.fields.archived).split(',').filter(Boolean)
  return archived.length === 1 && archived[0] === String(wanted.id)
    ? { pass: true, why: 'archived only the right message' }
    : { pass: false, why: `archived ids: ${archived.join(', ') || 'none'}; wanted ${wanted.id}` }
}

export const shiftingList: LocalTask = {
  id: 'shifting-list',
  set: 'browser',
  place: 'local',
  kind: 'recovery',
  prompt: site =>
    `In the mail app at ${site}/shifting-list/, archive the message from ${sender} with the subject "${subject}" (and only that one), then reply with the reference number inside it.`,
  check: seen => all(archivedOnly(seen), answered(seen, wanted.reference)),
  page(path) {
    if (path === '/') return inbox
    if (path === '/promo') return promo
    const match = path.match(/^\/message\/(\d+)$/)
    return match ? open(Number(match[1])) : undefined
  },
}
