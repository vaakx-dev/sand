import { all, noTabAt, type LocalTask, type Seen, type Verdict } from '../task'
import { layout, pick } from './layout'

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const patient = pick(['Priya Raman', 'Tomas Berg', 'Lena Okafor', 'Mateo Silva'])

const pad = (value: number) => String(value).padStart(2, '0')

const today = new Date()
const target = new Date(today.getFullYear(), today.getMonth() + 4 + Math.floor(Math.random() * 5), 1)
const secondTuesday = 1 + ((9 - target.getDay()) % 7) + 7
const isoDate = `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(secondTuesday)}`
const monthName = `${months[target.getMonth()]} ${target.getFullYear()}`

const slots = Array.from({ length: 41 }, (_, index) => 8 * 60 + index * 15)
const booked = new Set(slots.filter(() => Math.random() < 0.3))
const wanted = pick(slots.filter(minutes => !booked.has(minutes) && minutes >= 9 * 60 && minutes <= 17 * 60 + 45))
const clock = (minutes: number) => `${((Math.floor(minutes / 60) + 11) % 12) + 1}:${pad(minutes % 60)} ${minutes < 720 ? 'AM' : 'PM'}`
const isoTime = (minutes: number) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`

const css = `
.shell { max-width: 520px; margin: 32px auto; background: #fff; border: 1px solid #d5d9e0; border-radius: 10px; padding: 24px 28px 28px; }
.shell h1 { margin: 0 0 4px; font-size: 22px; } .shell p.sub { margin: 0 0 8px; color: #5b6472; }
.pick { position: relative; max-width: 420px; }
.pick > input, .pick > button.field { width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #aeb5c0; border-radius: 6px; background: #fff; cursor: pointer; text-align: left; font: inherit; display: flex; justify-content: space-between; }
.pick > input { display: block; }
.pop { position: absolute; left: 0; top: 100%; margin-top: 4px; background: #fff; border: 1px solid #c3c9d3; border-radius: 8px; box-shadow: 0 6px 20px rgba(0,0,0,.18); z-index: 5; }
.cal { padding: 10px; width: 280px; } .calhead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; } .calhead b { font-size: 15px; }
.calhead button { width: 32px; height: 32px; border: 0; background: #eef1f6; border-radius: 16px; font-size: 20px; cursor: pointer; line-height: 1; } .calhead button:disabled { opacity: .35; cursor: default; }
.days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; text-align: center; } .days span { font-size: 12px; color: #6b7482; padding: 4px 0; }
.days button { height: 34px; border: 0; background: none; border-radius: 17px; font: inherit; font-size: 14px; cursor: pointer; } .days button:hover:not(:disabled) { background: #e3ebfb; }
.days button:disabled { color: #b8beca; cursor: not-allowed; } .days button.today { outline: 1px solid #2155c4; } .days button.chosen { background: #2155c4; color: #fff; }
.slots { width: 100%; max-height: 210px; overflow-y: auto; box-sizing: border-box; padding: 4px 0; }
.slots div { padding: 7px 12px; cursor: pointer; } .slots div:hover { background: #e3ebfb; } .slots div.taken { color: #aab0bb; cursor: not-allowed; text-decoration: line-through; background: none; } .slots div.chosen { font-weight: 700; }
.go { margin-top: 20px; background: #2155c4; color: #fff; border: 0; border-radius: 6px; padding: 10px 20px; cursor: pointer; }`

const page = layout(
  'Book an appointment',
  `<style>${css}</style><header><b>Riverside Clinic</b><span>Appointments</span></header>
<form class="shell" action="/date-picker/booked"><h1>Book an appointment</h1><p class="sub">Choose a day and a time that suits you.</p>
<label for="name">Patient name</label><input type="text" id="name" name="name">
<label for="date-field">Date</label>
<div class="pick" id="date-pick"><input type="text" id="date-field" readonly placeholder="Select a date" autocomplete="off"><input type="hidden" name="date" id="date-value"><div class="pop cal" id="cal" hidden></div></div>
<label id="time-label">Time</label>
<div class="pick" id="time-pick"><button type="button" class="field" id="time-field" aria-labelledby="time-label"><span id="time-shown">Select a time</span><span>▾</span></button><input type="hidden" name="time" id="time-value"><div class="pop slots" id="slots" role="listbox" hidden></div></div>
<button class="go">Book appointment</button></form>`,
  `const names = ${JSON.stringify(months)}
const slots = ${JSON.stringify(slots.map(minutes => ({ minutes, label: clock(minutes), value: isoTime(minutes), taken: booked.has(minutes) })))}
const today = new Date()
let shown = new Date(today.getFullYear(), today.getMonth(), 1)
let chosen = ''
const pad = value => String(value).padStart(2, '0')
const cal = document.getElementById('cal')
const list = document.getElementById('slots')

const drawCalendar = () => {
  const first = shown.getDay()
  const count = new Date(shown.getFullYear(), shown.getMonth() + 1, 0).getDate()
  const cells = Array.from({ length: first }, () => '<span></span>')
  for (let day = 1; day <= count; day++) {
    const date = new Date(shown.getFullYear(), shown.getMonth(), day)
    const iso = date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(day)
    const off = date.getDay() % 6 === 0 || date < new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const marks = (iso === chosen ? ' chosen' : '') + (date.toDateString() === today.toDateString() ? ' today' : '')
    cells.push('<button type="button" class="' + marks + '" data-iso="' + iso + '"' + (off ? ' disabled' : '') + '>' + day + '</button>')
  }
  const atStart = shown.getFullYear() === today.getFullYear() && shown.getMonth() === today.getMonth()
  cal.innerHTML = '<div class="calhead"><button type="button" id="prev" aria-label="Previous month"' + (atStart ? ' disabled' : '') + '>‹</button><b>' + names[shown.getMonth()] + ' ' + shown.getFullYear() + '</b><button type="button" id="next" aria-label="Next month">›</button></div><div class="days">' + ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => '<span>' + day + '</span>').join('') + cells.join('') + '</div>'
  cal.querySelector('#prev').onclick = () => { shown = new Date(shown.getFullYear(), shown.getMonth() - 1, 1); drawCalendar() }
  cal.querySelector('#next').onclick = () => { shown = new Date(shown.getFullYear(), shown.getMonth() + 1, 1); drawCalendar() }
  for (const button of cal.querySelectorAll('[data-iso]')) button.onclick = () => {
    chosen = button.dataset.iso
    const date = new Date(chosen + 'T00:00')
    document.getElementById('date-value').value = chosen
    document.getElementById('date-field').value = date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    cal.hidden = true
  }
}

const drawSlots = () => {
  list.replaceChildren(...slots.map(slot => {
    const row = document.createElement('div')
    row.setAttribute('role', 'option')
    row.textContent = slot.label + (slot.taken ? ' · booked' : '')
    row.className = (slot.taken ? 'taken' : '') + (slot.value === document.getElementById('time-value').value ? ' chosen' : '')
    row.onclick = () => {
      if (slot.taken) return
      document.getElementById('time-value').value = slot.value
      document.getElementById('time-shown').textContent = slot.label
      list.hidden = true
    }
    return row
  }))
}

document.getElementById('date-field').onclick = () => { list.hidden = true; drawCalendar(); cal.hidden = !cal.hidden }
document.getElementById('time-field').onclick = () => { cal.hidden = true; drawSlots(); list.hidden = !list.hidden }
document.addEventListener('click', event => {
  const path = event.composedPath()
  if (!path.includes(document.getElementById('date-pick'))) cal.hidden = true
  if (!path.includes(document.getElementById('time-pick'))) list.hidden = true
})`,
)

const confirmation = layout('Appointment booked', '<header><b>Riverside Clinic</b></header><main><h1>Your appointment is booked.</h1></main>')

const filled = ({ tabs }: Seen): Verdict => {
  const tab = tabs.find(tab => /\/date-picker\/$/.test(tab.url))
  if (!tab) return { pass: false, why: 'the form is not open' }
  const wrong = Object.entries({ name: patient, date: isoDate, time: isoTime(wanted) }).filter(([field, value]) => tab.fields[field] !== value)
  return wrong.length
    ? { pass: false, why: `wrong fields: ${wrong.map(([field]) => `${field}=${JSON.stringify(tab.fields[field])}`).join(', ')}; wanted ${isoDate} ${isoTime(wanted)}` }
    : { pass: true, why: 'name, date and time right' }
}

export const datePicker: LocalTask = {
  id: 'date-picker',
  set: 'browser',
  place: 'local',
  kind: 'picker',
  prompt: site =>
    `Open ${site}/date-picker/, an appointment form. Fill in the patient name "${patient}", pick the second Tuesday of ${monthName} as the date and ${clock(wanted)} as the time. Do not book the appointment.`,
  check: seen => all(noTabAt(seen, /\/date-picker\/booked/, 'booked the appointment'), filled(seen)),
  page(path) {
    if (path === '/') return page
    if (path === '/booked') return confirmation
    return undefined
  },
}
