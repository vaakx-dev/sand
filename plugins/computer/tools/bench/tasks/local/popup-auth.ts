import { all, noTabAt, type LocalTask, type Seen, type Verdict } from '../task'
import { layout, pick, shuffled } from './layout'

interface Account {
  name: string
  email: string
  calendars: string[]
}

const calendarNames = ['Work', 'Team offsites', 'Personal', 'Family', 'Release schedule', 'Gym classes', 'Travel', 'Birthdays']

const [twin, other, third] = shuffled(['Dana Reyes', 'Marcus Webb', 'Priya Nair', 'Tomas Lindqvist'])

const people = [
  { name: twin!, domain: 'brightpath' },
  { name: twin!, domain: 'brightpath-labs' },
  { name: other!, domain: 'harborline' },
  { name: third!, domain: 'mail' },
]

const target = Math.floor(Math.random() * people.length)
const calendar = pick(calendarNames)

const accounts: Account[] = people.map(({ name, domain }, index) => {
  const names = shuffled(calendarNames.filter(each => each !== calendar)).slice(0, 3)
  const listed = index === target || index === (target + 1) % people.length
  return { name, email: `${name.toLowerCase().replace(' ', '.')}@${domain}.example`, calendars: shuffled(listed ? [calendar, ...names] : names) }
})

const goal = accounts[target]!

const grants = [
  { scope: 'calendar.read', label: 'See your calendars and the events on them' },
  { scope: 'calendar.write', label: 'Create, change and delete events on your calendars' },
  { scope: 'contacts.read', label: 'See your contacts' },
]

const mainScript = `const accounts = ${JSON.stringify(accounts)}
const field = id => document.getElementById(id)
let signin
field('connect').onclick = () => { signin = window.open('/popup-auth/signin', 'signin', 'popup,width=480,height=640') }
window.addEventListener('message', event => {
  if (event.origin !== location.origin || event.source !== signin) return
  const grant = event.data
  const account = accounts.find(each => each.email === grant.account)
  field('account').value = grant.account
  field('scopes').value = grant.scopes.join(',')
  field('finished').value = 'no'
  field('who').textContent = 'Connected as ' + grant.account
  const select = field('calendar')
  const canRead = grant.scopes.includes('calendar.read')
  const options = canRead ? [['', 'Choose a calendar'], ...account.calendars.map(name => [name, name])] : [['', 'No calendar access was granted']]
  select.replaceChildren(...options.map(([value, label]) => new Option(label, value)))
  select.disabled = !canRead
  field('message').textContent = ''
})
field('finish').onclick = () => {
  const done = field('account').value && field('calendar').value
  field('finished').value = done ? 'yes' : 'no'
  field('message').textContent = done ? 'Your calendar is connected.' : 'Connect an account and choose a calendar first.'
}`

const signinScript = `const accounts = ${JSON.stringify(accounts.map(({ name, email }) => ({ name, email })))}
const grants = ${JSON.stringify(grants)}
const card = document.getElementById('card')
const choose = account => {
  card.innerHTML = '<h1>Tempo Planner wants access</h1><p>Signed in as <b></b></p><form><div class="scopes">' + grants.map(grant => '<label class="scope"><input type="checkbox" name="scope" value="' + grant.scope + '" checked> ' + grant.label + '</label>').join('') + '</div><div class="actions"><button type="button" class="ghost" id="cancel">Cancel</button><button type="submit" class="allow">Allow</button></div></form>'
  card.querySelector('b').textContent = account.email
  document.getElementById('cancel').onclick = () => window.close()
  card.querySelector('form').onsubmit = event => {
    event.preventDefault()
    const scopes = [...card.querySelectorAll('input:checked')].map(box => box.value)
    window.opener.postMessage({ account: account.email, scopes }, location.origin)
    window.close()
  }
}
card.innerHTML = '<h1>Choose an account</h1><p>to continue to Tempo Planner</p>' + accounts.map((account, index) => '<button type="button" class="account" data-index="' + index + '"><span class="who"></span><span class="mail"></span></button>').join('')
card.querySelectorAll('.account').forEach((button, index) => {
  button.querySelector('.who').textContent = accounts[index].name
  button.querySelector('.mail').textContent = accounts[index].email
  button.onclick = () => choose(accounts[index])
})`

const main = layout(
  'Tempo Planner - Calendar',
  `<style>
.bar { background: #fff; border-bottom: 1px solid #d5d9e0; padding: 14px 28px; font-weight: 700; color: #0d6b5f; font-size: 18px; } .box { max-width: 560px; margin: 40px auto; background: #fff; border: 1px solid #d5d9e0; border-radius: 12px; padding: 28px 32px; }
.box h1 { margin: 0 0 6px; font-size: 22px; } .box p { color: #4a5568; margin: 0 0 16px; } .link { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; } #who { color: #4a5568; }
.btn { background: #0d6b5f; color: #fff; border: 0; border-radius: 6px; padding: 9px 18px; cursor: pointer; } #message { color: #17803f; min-height: 24px; }
</style><div class="bar">Tempo Planner</div>
<div class="box"><h1>Connect your calendar</h1><p>Sync your events into Tempo Planner to see them next to your tasks.</p>
<div class="link"><button type="button" class="btn" id="connect">Connect calendar</button><span id="who">Not connected</span></div>
<label for="calendar">Calendar to sync</label><select id="calendar" name="calendar" disabled><option value="">Connect an account first</option></select>
<p style="margin-top:20px"><button type="button" class="btn" id="finish">Finish</button></p><p id="message" role="status"></p>
<input type="hidden" name="account" id="account" value=""><input type="hidden" name="scopes" id="scopes" value=""><input type="hidden" name="finished" id="finished" value="no"></div>`,
  mainScript,
)

const signin = layout(
  'Sign in - Orbit Accounts',
  `<style>
body { background: #fff; } #card { max-width: 380px; margin: 24px auto; padding: 0 20px; } #card h1 { font-size: 22px; margin: 0 0 4px; font-weight: 500; } #card p { color: #5b6472; margin: 0 0 16px; }
.account { display: block; width: 100%; text-align: left; background: #fff; border: 1px solid #d5d9e0; border-radius: 8px; padding: 10px 14px; margin-bottom: 8px; cursor: pointer; } .account:hover { background: #f3f6fb; } .who { display: block; font-weight: 600; } .mail { display: block; font-size: 14px; color: #5b6472; }
.scope { display: flex; gap: 10px; align-items: flex-start; margin: 0; padding: 10px 0; border-bottom: 1px solid #e6e9ef; font-size: 15px; } .scope input { margin-top: 5px; }
.actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; } .allow { background: #1a56c8; color: #fff; border: 0; border-radius: 6px; padding: 9px 22px; cursor: pointer; } .ghost { background: #fff; border: 1px solid #aeb5c0; border-radius: 6px; padding: 9px 18px; cursor: pointer; }
</style><div id="card"></div>`,
  signinScript,
)

const pages = new Map([
  ['/', main],
  ['/signin', signin],
])

const state = ({ tabs }: Seen) => tabs.find(tab => /\/popup-auth\/$/.test(tab.url))?.fields

const same = (what: string, found: string | boolean | undefined, wanted: string): Verdict =>
  found === wanted ? { pass: true, why: `${what} ok` } : { pass: false, why: `${what} is "${found ?? 'unset'}", wanted "${wanted}"` }

export const popupAuth: LocalTask = {
  id: 'popup-auth',
  set: 'browser',
  place: 'local',
  kind: 'tabs',
  prompt: site =>
    `At ${site}/popup-auth/ connect the calendar of ${goal.email} to Tempo Planner, giving the app permission to read the calendar and nothing else. Then choose the calendar "${calendar}" and press Finish.`,
  check: seen => {
    const fields = state(seen)
    return all(
      noTabAt(seen, /\/popup-auth\/signin/, 'sign-in window left open'),
      same('account', fields?.account, goal.email),
      same('permissions', fields?.scopes, 'calendar.read'),
      same('calendar', fields?.calendar, calendar),
      same('finished', fields?.finished, 'yes'),
    )
  },
  page: path => pages.get(path),
}
