import { all, noTabAt, type LocalTask, type Seen, type Verdict } from '../task'
import { layout, pick } from './layout'

const codes = `AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW`.split(' ')

const display = new Intl.DisplayNames('en', { type: 'region' })

const countries = codes.map(code => ({ code, name: display.of(code) ?? code })).sort((a, b) => a.name.localeCompare(b.name))

const regions: Record<string, string[]> = {
  SE: ['Blekinge', 'Dalarna', 'Gävleborg', 'Gotland', 'Halland', 'Jämtland', 'Jönköping', 'Kalmar', 'Kronoberg', 'Norrbotten', 'Örebro', 'Östergötland', 'Skåne', 'Södermanland', 'Stockholm', 'Uppsala', 'Värmland', 'Västerbotten', 'Västernorrland', 'Västmanland', 'Västra Götaland'],
  ZA: ['Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape'],
  TH: ['Ayutthaya', 'Bangkok', 'Chiang Mai', 'Chiang Rai', 'Khon Kaen', 'Krabi', 'Nakhon Ratchasima', 'Phuket', 'Songkhla', 'Surat Thani', 'Udon Thani'],
  UA: ['Cherkasy', 'Chernihiv', 'Dnipropetrovsk', 'Kharkiv', 'Kherson', 'Kyiv', 'Lviv', 'Odesa', 'Poltava', 'Vinnytsia', 'Zakarpattia', 'Zhytomyr'],
  UY: ['Artigas', 'Canelones', 'Cerro Largo', 'Colonia', 'Durazno', 'Flores', 'Florida', 'Lavalleja', 'Maldonado', 'Montevideo', 'Paysandú', 'Río Negro', 'Rivera', 'Rocha', 'Salto', 'San José', 'Soriano', 'Tacuarembó', 'Treinta y Tres'],
  VN: ['Cao Bang', 'Can Tho', 'Da Nang', 'Dak Lak', 'Dong Nai', 'Ha Giang', 'Hanoi', 'Haiphong', 'Ho Chi Minh City', 'Lam Dong', 'Lang Son', 'Nghe An', 'Quang Ninh', 'Thanh Hoa'],
}

const fallback = ['Central', 'Eastern', 'Northern', 'Southern', 'Western']

const speeds = [
  { value: 'standard', label: 'Standard', note: '5–7 days' },
  { value: 'express', label: 'Express', note: '2–3 days' },
  { value: 'overnight', label: 'Overnight', note: 'next day' },
  { value: 'same-day', label: 'Same day', note: 'today' },
]

const country = pick(countries.filter(entry => entry.code in regions))
const region = pick(regions[country.code] ?? [])
const speed = pick(speeds.slice(1))

const css = `
.card { max-width: 520px; margin: 28px auto; background: #fff; border: 1px solid #d5d9e0; border-radius: 10px; padding: 24px 28px 28px; } .card h1 { margin: 0 0 4px; font-size: 22px; }
.drop { position: relative; max-width: 440px; } .drop > button { width: 100%; box-sizing: border-box; padding: 8px 10px; border: 1px solid #aeb5c0; border-radius: 6px; background: #fff; text-align: left; cursor: pointer; display: flex; justify-content: space-between; }
.drop > button:disabled { background: #eef0f4; color: #7b8493; cursor: default; }
.list { position: absolute; left: 0; right: 0; top: 100%; margin-top: 4px; height: 240px; overflow-y: scroll; background: #fff; border: 1px solid #c3c9d3; border-radius: 8px; box-shadow: 0 6px 20px rgba(0,0,0,.18); z-index: 5; }
.list div { height: 36px; box-sizing: border-box; padding: 0 12px; display: flex; align-items: center; justify-content: space-between; cursor: pointer; } .list div:hover { background: #e3ebfb; } .list div.on { background: #d3e3fd; font-weight: 600; } .list small { color: #8a93a2; }
.seg { display: flex; max-width: 440px; border: 1px solid #aeb5c0; border-radius: 8px; overflow: hidden; } .seg button { flex: 1; padding: 8px 4px; border: 0; border-right: 1px solid #aeb5c0; background: #fff; cursor: pointer; line-height: 1.2; } .seg button:last-child { border-right: 0; } .seg button small { display: block; color: #7b8493; font-size: 11px; } .seg button.on { background: #2155c4; color: #fff; } .seg button.on small { color: #d3e3fd; }
.go { margin-top: 22px; background: #2155c4; color: #fff; border: 0; border-radius: 6px; padding: 10px 22px; cursor: pointer; }`

const page = layout(
  'Shipping address',
  `<style>${css}</style><header><b>Parcelly</b><span>Checkout · Shipping</span></header>
<form class="card" action="/combobox/sent"><h1>Shipping address</h1>
<label for="who">Full name</label><input type="text" id="who" value="Alex Morgan">
<label for="street">Street address</label><input type="text" id="street" value="14 Harbour Lane">
<label id="country-label">Country</label>
<div class="drop" id="country-drop"><button type="button" id="country-field" aria-labelledby="country-label"><span id="country-shown">Select a country</span><span>▾</span></button><div class="list" id="country-list" role="listbox" hidden></div></div>
<label id="region-label">Region</label>
<div class="drop" id="region-drop"><button type="button" id="region-field" aria-labelledby="region-label" disabled><span id="region-shown">Select a country first</span><span>▾</span></button><div class="list" id="region-list" role="listbox" hidden></div></div>
<label id="speed-label">Delivery speed</label>
<div class="seg" role="radiogroup" aria-labelledby="speed-label" id="speeds"></div>
<input type="hidden" name="country" id="country"><input type="hidden" name="region" id="region"><input type="hidden" name="speed" id="speed" value="standard">
<button class="go">Continue to payment</button></form>`,
  `const countries = ${JSON.stringify(countries)}
const regions = ${JSON.stringify(regions)}
const fallback = ${JSON.stringify(fallback)}
const speeds = ${JSON.stringify(speeds)}
let loading = 0
const lists = ['country', 'region'].map(id => document.getElementById(id + '-list'))

const choose = (id, value, label, then) => {
  document.getElementById(id).value = value
  document.getElementById(id + '-shown').textContent = label
  document.getElementById(id + '-list').hidden = true
  if (then) then()
}

const fill = (id, entries, pickEntry) => {
  const list = document.getElementById(id + '-list')
  list.replaceChildren(...entries.map(entry => {
    const row = document.createElement('div')
    row.setAttribute('role', 'option')
    row.innerHTML = '<span></span><small></small>'
    row.firstChild.textContent = entry.label
    row.lastChild.textContent = entry.hint || ''
    row.onclick = () => pickEntry(entry)
    return row
  }))
}

const loadRegions = country => {
  const token = ++loading
  const field = document.getElementById('region-field')
  document.getElementById('region').value = ''
  document.getElementById('region-shown').textContent = 'Loading…'
  field.disabled = true
  setTimeout(() => {
    if (token !== loading) return
    const names = regions[country.code] || fallback.map(part => part + ' ' + country.name)
    fill('region', names.map(label => ({ label })), entry => choose('region', entry.label, entry.label))
    document.getElementById('region-shown').textContent = 'Select a region'
    field.disabled = false
  }, 900)
}

fill('country', countries.map(entry => ({ ...entry, label: entry.name, hint: entry.code })), entry => choose('country', entry.code, entry.label, () => loadRegions(entry)))

for (const id of ['country', 'region']) document.getElementById(id + '-field').onclick = () => {
  const list = document.getElementById(id + '-list')
  for (const other of lists) if (other !== list) other.hidden = true
  list.hidden = !list.hidden
}

document.addEventListener('click', event => {
  const path = event.composedPath()
  for (const id of ['country', 'region']) if (!path.includes(document.getElementById(id + '-drop'))) document.getElementById(id + '-list').hidden = true
})

const seg = document.getElementById('speeds')
const drawSpeeds = () => seg.replaceChildren(...speeds.map(speed => {
  const button = document.createElement('button')
  button.type = 'button'
  button.setAttribute('role', 'radio')
  button.setAttribute('aria-checked', String(speed.value === document.getElementById('speed').value))
  button.className = speed.value === document.getElementById('speed').value ? 'on' : ''
  button.innerHTML = speed.label + '<small>' + speed.note + '</small>'
  button.onclick = () => { document.getElementById('speed').value = speed.value; drawSpeeds() }
  return button
}))
drawSpeeds()`,
)

const sent = layout('Order placed', '<header><b>Parcelly</b></header><main><h1>Continuing to payment…</h1></main>')

const filled = ({ tabs }: Seen): Verdict => {
  const tab = tabs.find(tab => /\/combobox\/$/.test(tab.url))
  if (!tab) return { pass: false, why: 'the form is not open' }
  const wrong = Object.entries({ country: country.code, region, speed: speed.value }).filter(([field, value]) => tab.fields[field] !== value)
  return wrong.length
    ? { pass: false, why: `wrong fields: ${wrong.map(([field]) => `${field}=${JSON.stringify(tab.fields[field])}`).join(', ')}` }
    : { pass: true, why: 'country, region and speed right' }
}

export const combobox: LocalTask = {
  id: 'combobox',
  set: 'browser',
  place: 'local',
  kind: 'picker',
  prompt: site =>
    `Open ${site}/combobox/, a shipping address form. Set the country to ${country.name}, the region to ${region} and the delivery speed to ${speed.label}. Do not continue to payment.`,
  check: seen => all(noTabAt(seen, /\/combobox\/sent/, 'continued to payment'), filled(seen)),
  page(path) {
    if (path === '/') return page
    if (path === '/sent') return sent
    return undefined
  },
}
