import type { LocalTask, Seen, Verdict } from '../task'
import { layout, pick, shuffled } from './layout'

const draw = (titles: string[]) => shuffled(titles).slice(0, 5 + Math.floor(Math.random() * 3))

const columns = {
  backlog: {
    name: 'Backlog',
    cards: draw(['Audit unused feature flags', 'Add CSV export to reports', 'Dark mode for settings', 'Rate limit the public API', 'Localize billing emails', 'Replace legacy date picker', 'Archive inactive workspaces']),
  },
  progress: {
    name: 'In progress',
    cards: draw(['Migrate sessions to Redis', 'Redesign onboarding checklist', 'Fix timezone bug in invites', 'Upgrade payment SDK', 'Speed up dashboard queries', 'Write webhook retry logic', 'Draft status page copy']),
  },
  review: {
    name: 'Review',
    cards: draw(['Cache search suggestions', 'Add audit log filters', 'Refactor notification worker', 'Mobile nav overhaul', 'Harden password reset', 'Trim bundle size', 'Update privacy notice']),
  },
  done: {
    name: 'Done',
    cards: draw(['Ship team invitations', 'Remove jQuery from admin', 'Set up error budget alerts', 'Fix broken avatar upload', 'Document deploy process', 'Enable two-factor prompts', 'Clean up stale branches']),
  },
}

const cardA = pick(columns.backlog.cards)
const cardB = pick(columns.review.cards.slice(0, -1))
const cardC = pick(columns.progress.cards)

const wanted = {
  backlog: columns.backlog.cards.filter(title => title !== cardA),
  progress: columns.progress.cards.filter(title => title !== cardC),
  review: columns.review.cards.flatMap(title => (title === cardB ? [title, cardA] : [title])),
  done: [cardC, ...columns.done.cards],
}

const labels = ['Bug', 'Feature', 'Chore', 'Design']
const people = ['AK', 'MR', 'JS', 'LP', 'TN']

const card = (title: string) => {
  const hash = [...title].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return `<li class="card" data-title="${title}"><span class="tag t${hash % labels.length}">${labels[hash % labels.length]}</span><div>${title}</div><span class="who">${people[hash % people.length]}</span></li>`
}

const column = (id: string, { name, cards }: { name: string; cards: string[] }) =>
  `<section class="column" data-column="${id}"><h2>${name} <small>${cards.length}</small></h2><ul class="cards">${cards.map(card).join('')}</ul><input type="hidden" name="${id}" value="${cards.join('|')}"></section>`

const page = layout(
  'Atlas board',
  `<style>
body { overflow: hidden; user-select: none; }
.board { display: flex; gap: 16px; padding: 20px 24px; }
.column { flex: 1; background: #e8ebf0; border-radius: 10px; padding: 10px; display: flex; flex-direction: column; min-height: 600px; }
.column h2 { font-size: 15px; margin: 2px 4px 10px; } .column small { color: #667; font-weight: 400; }
.cards { list-style: none; margin: 0; padding: 0; flex: 1; }
.card { position: relative; background: #fff; border-radius: 6px; padding: 8px 40px 8px 10px; margin-bottom: 8px; height: 62px; box-sizing: border-box; box-shadow: 0 1px 2px rgba(0,0,0,.15); cursor: grab; font-size: 14px; line-height: 1.3; overflow: hidden; }
.card.ghost { position: fixed; z-index: 10; margin: 0; pointer-events: none; transform: rotate(2deg); box-shadow: 0 8px 18px rgba(0,0,0,.3); cursor: grabbing; }
.slot { height: 62px; margin-bottom: 8px; border: 2px dashed #8aa0c8; border-radius: 6px; background: #dce5f6; box-sizing: border-box; }
.tag { display: inline-block; font-size: 10px; text-transform: uppercase; padding: 0 6px; border-radius: 8px; color: #fff; background: #2155c4; }
.t1 { background: #2a9d3f; } .t2 { background: #7a6a4f; } .t3 { background: #a8479b; } .t0 { background: #c0392b; }
.who { position: absolute; right: 8px; top: 8px; width: 24px; height: 24px; border-radius: 50%; background: #23395d; color: #fff; font-size: 10px; display: flex; align-items: center; justify-content: center; }
</style>
<header><b>Atlas</b><span>Project board</span><span>Sprint 14</span></header>
<div class="board">${Object.entries(columns)
    .map(([id, each]) => column(id, each))
    .join('')}</div>`,
  `const slot = document.createElement('div')
slot.className = 'slot'
let pressed
const sync = () => {
  for (const list of document.querySelectorAll('.cards')) {
    const column = list.closest('.column')
    column.querySelector('input').value = [...list.querySelectorAll('.card')].map(card => card.dataset.title).join('|')
    column.querySelector('small').textContent = list.querySelectorAll('.card').length
  }
}
const place = (x, y) => {
  const column = [...document.querySelectorAll('.column')].find(each => x >= each.getBoundingClientRect().left && x <= each.getBoundingClientRect().right)
  if (!column) return
  const list = column.querySelector('.cards')
  slot.remove()
  const before = [...list.querySelectorAll('.card:not(.ghost)')].find(card => {
    const box = card.getBoundingClientRect()
    return y < box.top + box.height / 2
  })
  list.insertBefore(slot, before ?? null)
}
document.addEventListener('mousedown', event => {
  const card = event.target.closest('.card')
  if (event.button === 0 && card) pressed = { card, x: event.clientX, y: event.clientY, grabX: 0, grabY: 0, started: false }
})
document.addEventListener('mousemove', event => {
  if (!pressed) return
  const { card } = pressed
  if (!pressed.started) {
    if (Math.hypot(event.clientX - pressed.x, event.clientY - pressed.y) < 5) return
    const box = card.getBoundingClientRect()
    pressed.started = true
    pressed.grabX = pressed.x - box.left
    pressed.grabY = pressed.y - box.top
    card.style.width = box.width + 'px'
    card.after(slot)
    card.classList.add('ghost')
  }
  card.style.left = event.clientX - pressed.grabX + 'px'
  card.style.top = event.clientY - pressed.grabY + 'px'
  place(event.clientX, event.clientY)
})
document.addEventListener('mouseup', () => {
  if (pressed?.started) {
    const { card } = pressed
    card.classList.remove('ghost')
    card.removeAttribute('style')
    slot.replaceWith(card)
    sync()
  }
  pressed = undefined
})`,
)

const placed = ({ tabs }: Seen): Verdict => {
  const tab = tabs.find(tab => /\/kanban\/$/.test(tab.url))
  if (!tab) return { pass: false, why: 'the board is not open' }
  const wrong = Object.entries(wanted).filter(([id, cards]) => tab.fields[id] !== cards.join('|'))
  return wrong.length ? { pass: false, why: `wrong order in ${wrong.map(([id]) => `${id}=${JSON.stringify(tab.fields[id])}`).join(', ')}` } : { pass: true, why: 'all columns in order' }
}

export const kanban: LocalTask = {
  id: 'kanban',
  set: 'browser',
  place: 'local',
  kind: 'drag',
  prompt: site =>
    `Open the project board at ${site}/kanban/. Move the card "${cardA}" from Backlog into Review, directly below the card "${cardB}". Then move the card "${cardC}" from In progress to the very top of Done. Leave every other card where it is and in the same order. The cards can only be moved by dragging them with the mouse.`,
  check: placed,
  page: path => (path === '/' ? page : undefined),
}
