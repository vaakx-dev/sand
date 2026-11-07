import { all, noTabAt, type LocalTask, type Seen, type Verdict } from '../task'
import { layout } from './layout'

const wanted = { name: 'Ada Lovelace', email: 'ada@example.org', topic: 'bug', message: 'The export button does nothing.', newsletter: false }

const form = layout(
  'Contact us',
  `<header><b>Northwind Support</b></header><main><h1>Contact us</h1><form action="/form/sent">
<label for="name">Full name</label><input type="text" id="name" name="name">
<label for="email">Email</label><input type="email" id="email" name="email">
<label for="topic">Topic</label><select id="topic" name="topic"><option value="general">General question</option><option value="billing">Billing</option><option value="bug">Bug report</option><option value="partner">Partnership</option></select>
<label for="message">Message</label><textarea id="message" name="message" rows="4"></textarea>
<label><input type="checkbox" name="newsletter" checked> Send me the monthly newsletter</label>
<p><button>Send message</button></p></form></main>`,
)

const sent = layout('Message sent', '<header><b>Northwind Support</b></header><main><h1>Thanks, your message was sent.</h1></main>')

const pages: Record<string, string> = { '/': form, '/sent': sent }

const same = (value: string | boolean | undefined, expected: string | boolean) =>
  typeof expected === 'string' ? typeof value === 'string' && value.trim().toLowerCase() === expected.toLowerCase() : value === expected

const filled = ({ tabs }: Seen): Verdict => {
  const tab = tabs.find(tab => /\/form\/$/.test(tab.url))
  if (!tab) return { pass: false, why: 'the form is not open' }
  const wrong = Object.entries(wanted).filter(([field, expected]) => !same(tab.fields[field], expected))
  return wrong.length
    ? { pass: false, why: `wrong fields: ${wrong.map(([field]) => `${field}=${JSON.stringify(tab.fields[field])}`).join(', ')}` }
    : { pass: true, why: 'all fields right' }
}

export const contact: LocalTask = {
  id: 'form',
  set: 'browser',
  place: 'local',
  kind: 'basic',
  prompt: site =>
    `Open ${site}/form/ and fill in the contact form: full name "${wanted.name}", email "${wanted.email}", topic "Bug report", message "${wanted.message}", and leave the newsletter box unticked. Do not send the form.`,
  check: seen => all(noTabAt(seen, /\/form\/sent/, 'sent the form'), filled(seen)),
  page: path => pages[path],
}
