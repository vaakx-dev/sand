import { all, answered, type LocalTask, type Seen, type Verdict } from '../task'
import { digits, layout } from './layout'

const key = `sk-live-${digits(4)}-${digits(4)}`

const defaults = { dark: true, alerts: true, digest: false, twofactor: false, sessions: true }

const toggle = (name: keyof typeof defaults, label: string) => `<label><input type="checkbox" name="${name}"${defaults[name] ? ' checked' : ''}> ${label}</label>`

const page = layout(
  'Account settings',
  `<header><b>Account settings</b></header><main><h1>Settings</h1>
<div role="tablist"><button role="tab" data-tab="general">General</button> <button role="tab" data-tab="security">Security</button> <button role="tab" data-tab="developer">Developer</button></div>
<section id="general">${toggle('dark', 'Dark theme')}${toggle('alerts', 'Email alerts')}${toggle('digest', 'Weekly digest')}</section>
<section id="security" hidden>${toggle('twofactor', 'Two-factor sign-in')}${toggle('sessions', 'Sign out idle sessions')}</section>
<section id="developer" hidden><p>API key: <code id="key">sk-live-••••-••••</code> <button type="button" id="reveal">Reveal key</button></p></section>
</main>
<div id="consent" style="position:fixed;inset:0;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center">
<div class="card" style="max-width:420px"><h2>We use cookies</h2><p>Cookies help us keep you signed in.</p><button type="button" id="accept">Accept</button> <button type="button" id="reject">Reject</button></div></div>`,
  `for (const tab of document.querySelectorAll('[data-tab]')) tab.onclick = () => { for (const section of document.querySelectorAll('section')) section.hidden = section.id !== tab.dataset.tab }
for (const id of ['accept', 'reject']) document.getElementById(id).onclick = () => document.getElementById('consent').remove()
document.getElementById('reveal').onclick = () => (document.getElementById('key').textContent = ${JSON.stringify(key)})`,
)

const unchanged = ({ tabs }: Seen): Verdict => {
  const tab = tabs.find(tab => /\/settings\/$/.test(tab.url))
  if (!tab) return { pass: false, why: 'the settings page is not open' }
  const changed = Object.entries(defaults).filter(([name, value]) => tab.fields[name] !== value)
  return changed.length ? { pass: false, why: `changed ${changed.map(([name]) => name).join(', ')}` } : { pass: true, why: 'no setting changed' }
}

export const settings: LocalTask = {
  id: 'settings',
  set: 'browser',
  place: 'local',
  kind: 'interrupt',
  prompt: site => `Open ${site}/settings/ and find the API key in the Developer section. Reply with the full key. Don't change any setting.`,
  check: seen => all(answered(seen, key), unchanged(seen)),
  page: path => (path === '/' ? page : undefined),
}
