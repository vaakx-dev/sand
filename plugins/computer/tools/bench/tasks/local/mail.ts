import { all, answered, tabAt, type LocalTask } from '../task'
import { digits, layout, shuffled } from './layout'

const invoice = `INV-${digits(5)}`

const filler = [
  ['Team Calendar', 'Standup moved to 10:00'],
  ['Northwind Billing', 'Your receipt for February'],
  ['Grace Hopper', 'Slides for Thursday'],
  ['IT Desk', 'Password expires in 7 days'],
  ['Linus Park', 'Re: Office plants'],
  ['Travel Desk', 'Your booking to Lisbon'],
  ['Newsletter', 'This week in design'],
  ['Maya Chen', 'Quick question about the roadmap'],
  ['HR', 'Holiday schedule'],
  ['Alex Romero', 'Photos from the offsite'],
  ['Security', 'New sign-in from Firefox'],
  ['Sam Taylor', 'Lunch?'],
  ['Facilities', 'Parking garage closed Monday'],
  ['Priya Nair', 'Draft contract attached'],
  ['Events', 'Tickets for the conference'],
  ['Dana Whitfield', 'Lunch on Friday?'],
  ['Dan Whitfield', 'Invoice for April'],
  ['Accounts Payable', 'Invoice approvals this week'],
]

const order = shuffled(filler)

const messages = [...order.slice(0, 13), ['Dana Whitfield', 'Invoice for March'], ...order.slice(13)].map(([from, subject], index) => ({
  id: 500 + index,
  from: from!,
  subject: subject!,
  body: from === 'Dana Whitfield' && subject === 'Invoice for March' ? `Hi, please find the March invoice attached. Invoice number: ${invoice}. Due in 30 days.` : 'Hi, just a short note. Thanks!',
}))

const wanted = messages.find(message => message.body.includes(invoice))!
const perPage = 10

const header = '<header><b>Mailbox</b><a href="/mail/">Inbox</a></header>'

const inbox = (page: number) => {
  const pages = Math.ceil(messages.length / perPage)
  const rows = messages
    .slice((page - 1) * perPage, page * perPage)
    .map(message => `<tr><td>${message.from}</td><td><a href="/mail/message/${message.id}">${message.subject}</a></td></tr>`)
    .join('')
  const links = Array.from({ length: pages }, (_, index) => `<a href="/mail/?page=${index + 1}">Page ${index + 1}</a>`).join(' ')
  return layout(`Inbox, page ${page}`, `${header}<main><h1>Inbox</h1><table><tr><th>From</th><th>Subject</th></tr>${rows}</table><p>${links}</p></main>`)
}

const open = (id: number) => {
  const message = messages.find(each => each.id === id)
  if (!message) return undefined
  return layout(message.subject, `${header}<main><h1>${message.subject}</h1><p>From: ${message.from}</p><p>${message.body}</p></main>`)
}

export const mail: LocalTask = {
  id: 'mail',
  set: 'browser',
  place: 'local',
  prompt: site => `In the webmail at ${site}/mail/, open the email from Dana Whitfield about the March invoice, and reply with the invoice number it mentions.`,
  check: seen => all(tabAt(seen, new RegExp(`/mail/message/${wanted.id}$`)), answered(seen, invoice)),
  page(path, query) {
    if (path === '/') return inbox(Number(query.get('page') ?? 1))
    const match = path.match(/^\/message\/(\d+)$/)
    return match ? open(Number(match[1])) : undefined
  },
}
