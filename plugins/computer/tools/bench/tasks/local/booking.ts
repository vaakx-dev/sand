import { all, answered, type LocalTask, type Seen, type Verdict } from '../task'
import { layout, pick, shuffled } from './layout'

const fields = ['from', 'to', 'date', 'flight', 'n1', 'b1', 'n2', 'b2', 'seat1', 'seat2', 'insurance', 'bag', 'meal', 'priority']
const cities = ['Lisbon', 'Berlin', 'Madrid', 'Vienna', 'Oslo', 'Rome', 'Athens', 'Dublin']
const airlines = ['Aerolux', 'Nordair', 'Sunjet', 'Cielo']
const extras = [
  { name: 'insurance', label: 'Travel insurance', price: 28, checked: true },
  { name: 'bag', label: 'Extra checked bag', price: 35, checked: false },
  { name: 'meal', label: 'In-flight meal', price: 12, checked: false },
  { name: 'priority', label: 'Priority boarding', price: 15, checked: false },
]

const prices = shuffled(Array.from({ length: 91 }, (_, index) => 150 + index * 3))
const cheap = prices.filter(price => price < 240)
const dear = prices.filter(price => price >= 250)

const timetable = [
  ['06:40', 0, cheap],
  ['07:25', 1, cheap],
  ['11:15', 0, cheap],
  ['12:05', 1, dear],
  ['13:50', 0, cheap],
  ['14:10', 1, cheap],
  ['14:35', 0, dear],
  ['16:10', 0, dear],
  ['17:30', 1, dear],
  ['18:45', 0, dear],
  ['19:55', 1, cheap],
  ['21:20', 0, dear],
] as const

const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3))
const clock = (total: number) => `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`

const flights = timetable.map(([depart, stops, pool], index) => ({
  id: `${airlines[index % airlines.length]!.slice(0, 2).toUpperCase()}${200 + index * 17}`,
  airline: airlines[index % airlines.length]!,
  depart,
  arrive: clock(minutes(depart) + (stops ? 310 : 160)),
  stops,
  price: pool.pop()!,
}))

const afternoon = flights.filter(flight => flight.stops === 0 && minutes(flight.depart) > minutes('14:00'))
const best = afternoon.reduce((cheapest, flight) => (flight.price < cheapest.price ? flight : cheapest))

const letters = ['A', 'B', 'C', 'D', 'E', 'F']
const rows = Array.from({ length: 24 }, (_, index) => index + 1)

const seats = (() => {
  const row = 12 + Math.floor(Math.random() * 10)
  const [first, second] = shuffled(letters)
  return [`${row}${first}`, `${row + 1}${second}`] as const
})()

const taken = new Set(rows.flatMap(row => letters.filter(() => Math.random() < 0.4).map(letter => `${row}${letter}`)))
for (const seat of seats) taken.add(`${seat.slice(0, -1)}${letters[(letters.indexOf(seat.slice(-1)) + 1) % letters.length]}`)
for (const seat of seats) taken.delete(seat)

const origin = pick(cities)
const trip = { from: origin, to: pick(cities.filter(city => city !== origin)), date: '2025-09-18' }

const people = [
  { name: pick(['Maria Okonkwo', 'Elena Vasquez', 'Priya Raman', 'Hanna Lindgren']), born: `19${60 + Math.floor(Math.random() * 35)}-0${1 + Math.floor(Math.random() * 9)}-${10 + Math.floor(Math.random() * 18)}` },
  { name: pick(['Tomas Berg', 'Kenji Mori', 'Oscar Duarte', 'Felix Hartmann']), born: `20${10 + Math.floor(Math.random() * 12)}-1${Math.floor(Math.random() * 3)}-${10 + Math.floor(Math.random() * 18)}` },
] as const

const wanted = {
  from: trip.from,
  to: trip.to,
  date: trip.date,
  flight: best.id,
  n1: people[0].name,
  b1: people[0].born,
  n2: people[1].name,
  b2: people[1].born,
  seat1: seats[0],
  seat2: seats[1],
  bag: '1',
}

const escape = (text: string) => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')

const referenceOf = (query: URLSearchParams) => {
  const text = fields.filter(field => !/^[nb][12]$/.test(field)).map(field => query.get(field) ?? '').join('|')
  const hash = [...text].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) % 2176782336, 7)
  return `SB-${hash.toString(36).toUpperCase().padStart(6, '0')}`
}

const carried = (query: URLSearchParams, before = '') => {
  const keys = before ? fields.slice(0, fields.indexOf(before)) : fields
  return keys.flatMap(key => (query.has(key) ? [`<input type="hidden" name="${key}" value="${escape(query.get(key)!)}">`] : [])).join('')
}

const steps = ['Search', 'Flights', 'Passengers', 'Seats', 'Extras', 'Review']

const shell = (step: number, body: string, script = '') =>
  layout(
    'Skybridge',
    `<style>
main { max-width: 820px; } ol.steps { display: flex; gap: 6px; list-style: none; padding: 0; margin: 0 0 20px; font-size: 13px; }
ol.steps li { padding: 3px 10px; border-radius: 12px; background: #e1e5ec; } ol.steps li.on { background: #2155c4; color: #fff; }
table.flights td, table.flights th { font-size: 14px; } a.select, .go { display: inline-block; background: #2155c4; color: #fff; border: 0; padding: 6px 14px; border-radius: 4px; text-decoration: none; cursor: pointer; }
.go[disabled] { background: #9aa6bd; cursor: default; } fieldset { border: 1px solid #d5d9e0; border-radius: 6px; margin-bottom: 16px; background: #fff; }
.plane { display: inline-block; background: #fff; border: 1px solid #d5d9e0; border-radius: 24px 24px 8px 8px; padding: 16px 20px; }
.line { display: flex; gap: 4px; align-items: center; margin-bottom: 4px; } .line b { width: 24px; font-size: 12px; color: #667; } .aisle { width: 18px; }
.seat { width: 26px; height: 24px; padding: 0; font-size: 11px; border: 1px solid #8aa0c8; background: #e4ecfb; border-radius: 4px 4px 2px 2px; cursor: pointer; }
.seat[disabled] { background: #c9cdd6; border-color: #b4b9c4; color: #7b8190; cursor: not-allowed; } .seat.chosen { background: #2a9d3f; color: #fff; border-color: #1c6f2b; }
</style>
<header><b>Skybridge Air</b><span>Manage booking</span><span>Check-in</span></header>
<main><ol class="steps">${steps.map((name, index) => `<li${index === step ? ' class="on"' : ''}>${index + 1}. ${name}</li>`).join('')}</ol>${body}</main>`,
    script,
  )

const search = () =>
  shell(
    0,
    `<h1>Find a flight</h1><form action="/booking/flights">
<label for="from">From</label><select id="from" name="from">${cities.map(city => `<option>${city}</option>`).join('')}</select>
<label for="to">To</label><select id="to" name="to">${cities.map(city => `<option>${city}</option>`).join('')}</select>
<label for="date">Departure date</label><input type="text" id="date" name="date" placeholder="YYYY-MM-DD">
<p><button class="go">Search flights</button></p></form>`,
  )

const results = (query: URLSearchParams) => {
  const link = (flight: string) => `/booking/passengers?${new URLSearchParams({ from: query.get('from') ?? '', to: query.get('to') ?? '', date: query.get('date') ?? '', flight })}`
  return shell(
    1,
    `<h1>${escape(query.get('from') ?? '')} to ${escape(query.get('to') ?? '')}, ${escape(query.get('date') ?? '')}</h1><p>2 passengers. Prices are per person.</p>
<table class="flights"><thead><tr><th>Flight</th><th>Departs</th><th>Arrives</th><th>Stops</th><th>Price</th><th></th></tr></thead><tbody>${flights
      .map(flight => `<tr><td>${flight.airline} ${flight.id}</td><td>${flight.depart}</td><td>${flight.arrive}</td><td>${flight.stops ? '1 stop' : 'Nonstop'}</td><td>€${flight.price}</td><td><a class="select" href="${escape(link(flight.id))}">Select</a></td></tr>`)
      .join('')}</tbody></table>`,
  )
}

const passengers = (query: URLSearchParams) =>
  shell(
    2,
    `<h1>Passengers</h1><form action="/booking/seats">${carried(query, 'n1')}
${[1, 2].map(number => `<fieldset><legend>Passenger ${number}</legend><label for="n${number}">Full name</label><input type="text" id="n${number}" name="n${number}" required><label for="b${number}">Date of birth</label><input type="text" id="b${number}" name="b${number}" placeholder="YYYY-MM-DD" required></fieldset>`).join('')}
<button class="go">Continue to seats</button></form>`,
  )

const seatmap = (query: URLSearchParams) =>
  shell(
    3,
    `<h1>Choose seats</h1><p id="who"></p><form action="/booking/extras">${carried(query, 'seat1')}
<div class="plane">${rows
      .map(
        row =>
          `<div class="line"><b>${row}</b>${letters
            .map((letter, index) => `${index === 3 ? '<span class="aisle"></span>' : ''}<button type="button" class="seat" data-seat="${row}${letter}" aria-label="Seat ${row}${letter}"${taken.has(`${row}${letter}`) ? ' disabled>×' : `>${letter}`}</button>`)
            .join('')}</div>`,
      )
      .join('')}</div>
<input type="hidden" name="seat1"><input type="hidden" name="seat2">
<p><button class="go" disabled>Continue to extras</button></p></form>`,
    `const names = [${JSON.stringify(query.get('n1') ?? 'Passenger 1')}, ${JSON.stringify(query.get('n2') ?? 'Passenger 2')}]
const picks = []
const render = () => {
  for (const seat of document.querySelectorAll('.seat')) seat.classList.toggle('chosen', picks.includes(seat.dataset.seat))
  document.getElementById('who').textContent = picks.length < 2 ? 'Pick a seat for ' + names[picks.length] + '.' : 'Both seats chosen: ' + picks.join(', ') + '.'
  document.querySelector('input[name=seat1]').value = picks[0] ?? ''
  document.querySelector('input[name=seat2]').value = picks[1] ?? ''
  document.querySelector('.go').disabled = picks.length < 2
}
document.querySelector('.plane').addEventListener('click', event => {
  const seat = event.target.closest('.seat')
  if (!seat || seat.disabled) return
  const at = picks.indexOf(seat.dataset.seat)
  if (at >= 0) picks.splice(at, 1)
  else if (picks.length < 2) picks.push(seat.dataset.seat)
  render()
})
render()`,
  )

const extrasPage = (query: URLSearchParams) =>
  shell(
    4,
    `<h1>Extras</h1><form action="/booking/review">${carried(query, 'insurance')}
${extras.map(extra => `<label><input type="checkbox" name="${extra.name}" value="1"${extra.checked ? ' checked' : ''}> ${extra.label} (€${extra.price} per person)</label>`).join('')}
<p><button class="go">Review booking</button></p></form>`,
  )

const review = (query: URLSearchParams) => {
  const fare = flights.find(flight => flight.id === query.get('flight'))?.price ?? 0
  const chosen = extras.filter(extra => query.has(extra.name))
  const total = 2 * (fare + chosen.reduce((sum, extra) => sum + extra.price, 0))
  const rowOf = (label: string, value: string) => `<tr><th>${label}</th><td>${escape(value)}</td></tr>`
  return shell(
    5,
    `<h1>Review and confirm</h1><table>
${rowOf('Route', `${query.get('from')} to ${query.get('to')}`)}${rowOf('Date', query.get('date') ?? '')}${rowOf('Flight', query.get('flight') ?? '')}
${rowOf('Passengers', `${query.get('n1')} (${query.get('b1')}), ${query.get('n2')} (${query.get('b2')})`)}${rowOf('Seats', `${query.get('seat1')}, ${query.get('seat2')}`)}
${rowOf('Extras', chosen.map(extra => extra.label).join(', ') || 'None')}${rowOf('Total', `€${total}`)}</table>
<form action="/booking/confirmed">${carried(query)}<p><button class="go">Confirm booking</button></p></form>`,
  )
}

const confirmed = (query: URLSearchParams) => shell(5, `<h1>Booking confirmed</h1><p>Your booking reference is <b>${referenceOf(query)}</b>. A receipt was sent to the lead passenger.</p>`)

const finished = ({ tabs }: Seen): Verdict => {
  const tab = tabs.find(tab => /\/booking\/confirmed\?/.test(tab.url))
  if (!tab) return { pass: false, why: `the booking was not confirmed; open: ${tabs.map(tab => tab.url).join(', ')}` }
  const query = new URL(tab.url).searchParams
  const same = (key: string, value: string) => query.get(key)?.trim().toLowerCase() === value.toLowerCase()
  const wrong = [...Object.entries(wanted).filter(([key, value]) => !same(key, value)).map(([key]) => `${key}=${query.get(key)}`), ...['insurance', 'meal', 'priority'].filter(key => query.has(key)).map(key => `${key} ticked`)]
  return wrong.length ? { pass: false, why: `wrong: ${wrong.join(', ')}` } : { pass: true, why: 'confirmed with the right choices' }
}

const reference = referenceOf(new URLSearchParams(wanted))

export const booking: LocalTask = {
  id: 'booking',
  set: 'browser',
  place: 'local',
  kind: 'flow',
  prompt: site =>
    `Book flights on the Skybridge Air test site at ${site}/booking/ (nothing real is bought, so you may confirm). Search ${trip.from} to ${trip.to} on ${trip.date}. Pick the cheapest nonstop flight that departs after 14:00. Passengers: ${people[0].name}, born ${people[0].born}, and ${people[1].name}, born ${people[1].born}. Seats: ${seats[0]} for the first passenger and ${seats[1]} for the second. No travel insurance, but add an extra checked bag; no other extras. Confirm the booking and reply with the booking reference.`,
  check: seen => all(finished(seen), answered(seen, reference)),
  page(path, query) {
    if (path === '/') return search()
    if (path === '/flights') return results(query)
    if (path === '/passengers') return passengers(query)
    if (path === '/seats') return seatmap(query)
    if (path === '/extras') return extrasPage(query)
    if (path === '/review') return review(query)
    if (path === '/confirmed') return confirmed(query)
    return undefined
  },
}
