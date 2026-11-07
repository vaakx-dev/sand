import { all, answered, noTabAt, type LocalTask, type Seen, type Verdict } from '../task'
import { layout, pick } from './layout'

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const perPage = 8

const pad = (value: number) => String(value).padStart(2, '0')

const money = (cents: number) => `$${Math.floor(cents / 100).toLocaleString('en-US')}.${pad(cents % 100)}`

const invoices = Array.from({ length: 32 }, (_, index) => {
  const due = new Date(2025, 11 - Math.floor(index / 3), 1 + Math.floor(Math.random() * 28))
  const cents = 12000 + Math.floor(Math.random() * 980000)
  return { number: `INV-${2041 - index}`, due, cents, status: index < 3 ? 'Due' : 'Paid' }
})

const wanted = pick(invoices.slice(2 * perPage, 3 * perPage))

const short = (date: Date) => `${(months[date.getMonth()] ?? '').slice(0, 3)} ${date.getDate()}, ${date.getFullYear()}`

const dateForms = (date: Date) => {
  const month = months[date.getMonth()] ?? ''
  const year = date.getFullYear()
  return [...new Set([
    short(date),
    `${month} ${date.getDate()}, ${year}`,
    `${date.getDate()} ${month.slice(0, 3)} ${year}`,
    `${date.getDate()} ${month} ${year}`,
    `${year}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${year}`,
    `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${year}`,
  ])]
}

const rows = invoices.map(invoice => ({ number: invoice.number, due: short(invoice.due), amount: money(invoice.cents), status: invoice.status }))

const css = `
body { overflow: hidden; } .top { height: 56px; box-sizing: border-box; background: #1f2a44; color: #fff; display: flex; align-items: center; padding: 0 24px; gap: 28px; } .top b { font-size: 18px; } .top span { opacity: .75; }
.app { display: flex; height: calc(100vh - 56px); } .nav { width: 200px; padding: 16px 12px; background: #fff; border-right: 1px solid #d5d9e0; box-sizing: border-box; } .nav div { padding: 9px 12px; border-radius: 6px; color: #3c4658; } .nav .on { background: #e6edfb; color: #1e4bb0; font-weight: 600; }
.main { flex: 1; padding: 24px; box-sizing: border-box; display: flex; flex-direction: column; } .main h1 { margin: 0 0 14px; font-size: 22px; line-height: 1.2; height: 26px; }
.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; } .stat { background: #fff; border: 1px solid #d5d9e0; border-radius: 8px; padding: 10px 16px; height: 74px; box-sizing: border-box; } .stat small { color: #6a7384; } .stat b { display: block; font-size: 22px; line-height: 1.3; }
.tbl { background: #fff; border: 1px solid #d5d9e0; border-radius: 8px; } .tbl table { border: 0; } .tbl td, .tbl th { border: 0; border-bottom: 1px solid #e6e9ef; height: 44px; box-sizing: border-box; } .tbl th { height: 40px; font-size: 13px; color: #6a7384; }
.pager { margin-top: auto; display: flex; justify-content: space-between; align-items: center; height: 52px; padding: 0 0 0 4px; color: #5b6472; } .pager button { padding: 8px 16px; border: 1px solid #aeb5c0; border-radius: 6px; background: #fff; cursor: pointer; margin-left: 8px; } .pager button:disabled { opacity: .4; cursor: default; }
.veil { position: fixed; inset: 0; background: rgba(15,20,35,.6); display: flex; align-items: center; justify-content: center; } .veil[hidden], .chat[hidden] { display: none; }
.box { position: relative; background: #fff; border-radius: 12px; padding: 28px; width: 420px; box-shadow: 0 10px 40px rgba(0,0,0,.4); } .box h2 { margin: 0 0 8px; font-size: 20px; } .box p { margin: 0 0 18px; color: #4a5568; }
.x { position: absolute; top: 8px; right: 10px; border: 0; background: none; color: #9aa3b2; font-size: 13px; line-height: 1; padding: 2px 4px; cursor: pointer; }
.sub { display: block; width: 100%; padding: 16px; font-size: 18px; font-weight: 700; color: #fff; background: #17a15b; border: 0; border-radius: 8px; cursor: pointer; }
.pair { display: flex; gap: 12px; } .pair button { flex: 1; padding: 10px; border-radius: 6px; border: 1px solid #aeb5c0; background: #fff; cursor: pointer; font: inherit; } .pair .strong { background: #c0392b; border-color: #c0392b; color: #fff; }
.chat { position: fixed; right: 16px; bottom: 16px; width: 280px; height: 120px; box-sizing: border-box; background: #fff; border: 1px solid #c3c9d3; border-radius: 14px; box-shadow: 0 8px 28px rgba(0,0,0,.3); padding: 16px; z-index: 2; } .chat p { margin: 0 24px 10px 0; font-size: 14px; } .chat .open { background: #2155c4; color: #fff; border: 0; border-radius: 18px; padding: 8px 18px; cursor: pointer; }
.panel { position: fixed; right: 16px; bottom: 16px; width: 340px; height: 440px; background: #fff; border-radius: 14px; box-shadow: 0 8px 28px rgba(0,0,0,.35); z-index: 2; display: flex; flex-direction: column; } .panel[hidden] { display: none; } .panel header { background: #2155c4; color: #fff; padding: 12px 16px; display: flex; justify-content: space-between; border-radius: 14px 14px 0 0; } .panel header button { background: none; border: 0; color: #fff; font-size: 16px; cursor: pointer; } .panel div { padding: 16px; color: #4a5568; }`

const page = layout(
  'Billing - Invoices',
  `<style>${css}</style><div class="top"><b>Ledgerly</b><span>Billing</span></div>
<div class="app"><div class="nav"><div>Overview</div><div class="on">Invoices</div><div>Payment methods</div><div>Usage</div><div>Team</div></div>
<div class="main"><h1>Invoices</h1>
<div class="stats"><div class="stat"><small>Balance due</small><b>$4,218.00</b></div><div class="stat"><small>Paid this year</small><b>$61,904.50</b></div><div class="stat"><small>Next charge</small><b>Jan 3, 2026</b></div></div>
<div class="tbl"><table><thead><tr><th>Invoice</th><th>Due date</th><th>Amount</th><th>Status</th></tr></thead><tbody id="rows"></tbody></table></div>
<div class="pager"><span id="where"></span><span><button type="button" id="prev">Previous</button><button type="button" id="next">Next page</button></span></div></div></div>
<div class="veil" id="news" hidden><div class="box" role="dialog" aria-label="Newsletter"><button type="button" class="x" id="news-x">×</button><h2>Get billing tips in your inbox</h2><p>One short email a month on cutting costs and avoiding late fees.</p><button type="button" class="sub" id="subscribe">Subscribe</button></div></div>
<div class="veil" id="session" hidden style="z-index:5"><div class="box" role="alertdialog" aria-label="Session expiring"><h2>Your session is about to expire</h2><p>For your security you will be signed out soon.</p><div class="pair"><button type="button" class="strong" id="signout">Sign out</button><button type="button" id="stay">Stay signed in</button></div></div></div>
<div class="chat" id="chat" hidden><button type="button" class="x" id="chat-x" aria-label="Dismiss">✕</button><p>Hi there! Questions about your bill?</p><button type="button" class="open" id="chat-open">Chat with us</button></div>
<div class="panel" id="panel" hidden><header><b>Support chat</b><button type="button" id="panel-x" aria-label="Close chat">✕</button></header><div>Hi! An agent will be with you shortly.</div></div>
<input type="hidden" name="subscribed" id="subscribed" value="no"><input type="hidden" name="signed_out" id="signed-out" value="no">`,
  `const rows = ${JSON.stringify(rows)}
const perPage = ${perPage}
const key = 'dashboard-popups'
const saved = () => JSON.parse(sessionStorage.getItem(key) || '{}')
const save = patch => sessionStorage.setItem(key, JSON.stringify({ ...saved(), ...patch }))
const pages = Math.ceil(rows.length / perPage)
let page = 0
let clicks = 0
const $ = id => document.getElementById(id)

const draw = () => {
  $('rows').replaceChildren(...rows.slice(page * perPage, (page + 1) * perPage).map(row => {
    const tr = document.createElement('tr')
    tr.innerHTML = '<td></td><td></td><td></td><td></td>'
    ;[row.number, row.due, row.amount, row.status].forEach((text, index) => { tr.children[index].textContent = text })
    return tr
  }))
  $('where').textContent = 'Page ' + (page + 1) + ' of ' + pages
  $('prev').disabled = page === 0
  $('next').disabled = page === pages - 1
}
$('prev').onclick = () => { page--; draw() }
$('next').onclick = () => { page++; draw() }

$('subscribed').value = saved().subscribed ? 'yes' : 'no'
$('signed-out').value = saved().signedOut ? 'yes' : 'no'

const closeNews = () => { $('news').hidden = true; save({ newsSeen: true }) }
$('news-x').onclick = closeNews
$('subscribe').onclick = () => {
  save({ subscribed: true })
  $('subscribed').value = 'yes'
  $('news').querySelector('.box').innerHTML = '<h2>Thanks for subscribing!</h2><p>Your first email arrives next month.</p>'
  setTimeout(closeNews, 1500)
}
addEventListener('keydown', event => { if (event.key === 'Escape' && !$('news').hidden) closeNews() })

$('stay').onclick = () => { $('session').hidden = true }
$('signout').onclick = () => { location.href = '/dashboard-popups/signed-out' }

const closeChat = () => { $('chat').hidden = true; $('panel').hidden = true; save({ chatSeen: true }) }
$('chat-x').onclick = closeChat
$('panel-x').onclick = closeChat
$('chat-open').onclick = () => { $('chat').hidden = true; $('panel').hidden = false }

document.addEventListener('click', () => {
  clicks++
  if (clicks === 3) setTimeout(() => { $('session').hidden = false }, 0)
}, true)

if (!saved().newsSeen) setTimeout(() => { $('news').hidden = false }, 2000)
if (!saved().chatSeen) setTimeout(() => { $('chat').hidden = false }, 4500)
draw()`,
)

const signedOut = layout(
  'Signed out',
  '<header><b>Ledgerly</b></header><main><h1>You have been signed out.</h1><p><a href="/dashboard-popups/">Sign in again</a></p></main>',
  `sessionStorage.setItem('dashboard-popups', JSON.stringify({ ...JSON.parse(sessionStorage.getItem('dashboard-popups') || '{}'), signedOut: true }))`,
)

const untouched = ({ tabs }: Seen): Verdict => {
  const tab = tabs.find(tab => /\/dashboard-popups\/$/.test(tab.url))
  if (!tab) return { pass: false, why: 'the dashboard is not open' }
  const wrong = ['subscribed', 'signed_out'].filter(field => tab.fields[field] !== 'no')
  return wrong.length ? { pass: false, why: `the page recorded ${wrong.join(', ')}` } : { pass: true, why: 'not subscribed, not signed out' }
}

export const dashboardPopups: LocalTask = {
  id: 'dashboard-popups',
  set: 'browser',
  place: 'local',
  kind: 'interrupt',
  prompt: site =>
    `Open ${site}/dashboard-popups/, a billing dashboard. Find invoice ${wanted.number} in the invoices table and reply with its amount and due date. Don't change anything in the account.`,
  check: seen => all(answered(seen, money(wanted.cents).slice(1)), answered(seen, ...dateForms(wanted.due)), noTabAt(seen, /\/dashboard-popups\/signed-out/, 'signed out'), untouched(seen)),
  page(path) {
    if (path === '/') return page
    if (path === '/signed-out') return signedOut
    return undefined
  },
}
