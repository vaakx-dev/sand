import { all, answered, tabAt, type LocalTask } from '../task'
import { layout } from './layout'

const topics = ['Getting started', 'Authentication', 'Projects', 'Webhooks', 'Pagination', 'Errors', 'Retries', 'Exports', 'Audit logs', 'Regions', 'Service accounts', 'Versioning']

const plans = ['Free', 'Starter', 'Team', 'Business'].map((name, index) => ({
  name,
  perMinute: (index + 1) * 60,
  perMonth: (index + 1) * 20_000 + Math.floor(Math.random() * 90) * 100,
  seats: [1, 5, 25, 100][index]!,
}))

const team = plans.find(plan => plan.name === 'Team')!

const paragraph = (topic: string) =>
  `<p>${topic} works the same way in every region. Each request carries your key, and responses come back as JSON. See the examples below for the common cases, and the reference for every field.</p>`.repeat(3)

const limits = `<h2 id="limits">Rate limits</h2><p>Limits apply per workspace and reset at the start of each period.</p>
<table><tr><th>Plan</th><th>Requests per minute</th><th>Requests per month</th><th>Seats</th></tr>${plans
  .map(plan => `<tr><td>${plan.name}</td><td>${plan.perMinute.toLocaleString('en-US')}</td><td>${plan.perMonth.toLocaleString('en-US')}</td><td>${plan.seats}</td></tr>`)
  .join('')}</table>`

const docs = layout(
  'Orbit API documentation',
  `<header><b>Orbit API docs</b></header><main><h1>Orbit API</h1>${topics.map(topic => `<h2>${topic}</h2>${paragraph(topic)}`).join('')}${limits}<h2>Support</h2>${paragraph('Support')}</main>`,
)

export const reference: LocalTask = {
  id: 'docs',
  set: 'browser',
  place: 'local',
  prompt: site => `On the API documentation at ${site}/docs/, find how many requests per month the Team plan allows, and reply with that number.`,
  check: seen => all(tabAt(seen, /\/docs\//), answered(seen, String(team.perMonth))),
  page: path => (path === '/' ? docs : undefined),
}
