import { answered, type LocalTask } from '../task'
import { digits, layout, pick } from './layout'

const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const orderNumber = digits(7)
const month = pick(months)
const day = 10 + Math.floor(Math.random() * 18)
const delivery = `${day} ${month} 2026`

const questions = [
  ['How do I change my delivery address?', 'Open your account, choose Orders and edit the address before the parcel is dispatched.'],
  ['Can I return an item?', 'Items can be returned within 30 days in their original packaging.'],
  ['Which payment methods do you accept?', 'We accept all major cards, bank transfer and gift vouchers.'],
  ['How long does standard delivery take?', 'Standard delivery takes three to five working days.'],
  ['Do you deliver on weekends?', 'Saturday delivery is available in most areas at checkout.'],
  ['How do I use a gift voucher?', 'Enter the voucher code in the basket before you pay.'],
  ['My parcel arrived damaged', 'Please keep the packaging and contact us within 48 hours.'],
  ['Can I cancel an order?', 'Orders can be cancelled until they are packed.'],
  ['Do you ship abroad?', 'We ship to most European countries.'],
  ['How do I reset my password?', 'Use the Forgot password link on the sign-in page.'],
]

const css = `<style>
.frame { border: 1px solid #d5d9e0; border-radius: 8px; background: #fff; display: block; }
.faq { border-bottom: 1px solid #e6e8ec; padding: 10px 4px; } .faq h3 { margin: 0 0 4px; font-size: 16px; }
</style>`

const help = layout(
  'Help centre',
  `${css}<header><b>Brightway Help Centre</b><a href="/support-iframe/">Home</a></header>
<main><h1>How can we help?</h1><p>Browse the answers below, or use the support widget.</p>
<div class="grid"><div class="card"><h3>Orders</h3><p>Tracking, changes and cancellations.</p></div><div class="card"><h3>Returns</h3><p>Refunds and exchanges.</p></div><div class="card"><h3>Account</h3><p>Sign-in and settings.</p></div></div>
<h2>Support widget</h2>
<iframe class="frame" src="/support-iframe/widget" width="900" height="520" title="Support widget"></iframe>
<p>Opening hours: Monday to Friday, 9:00 to 17:00.</p></main>`,
)

const widget = layout(
  'Support widget',
  `${css}<div style="padding:12px 16px"><h2 style="margin-top:0">Support</h2>
${questions.map(([question, answer]) => `<div class="faq"><h3>${question}</h3><p style="margin:0">${answer}</p></div>`).join('')}
<h2>Where is my order?</h2><p>Enter your order number to see the delivery date.</p>
<iframe class="frame" src="/support-iframe/lookup" width="100%" height="200" title="Order lookup"></iframe>
<p>Still stuck? Chat with us from 9:00 to 17:00.</p></div>`,
)

const lookup = layout(
  'Order lookup',
  `<main style="padding:12px 16px;max-width:none"><h3 style="margin-top:0">Order lookup</h3>
<form id="lookup"><label for="order" style="margin-top:0">Order number</label><input type="text" id="order" name="order" style="max-width:260px"> <button type="submit">Look up</button></form>
<p id="result"></p></main>`,
  `document.getElementById('lookup').onsubmit = event => {
  event.preventDefault()
  const value = document.getElementById('order').value.trim()
  document.getElementById('result').textContent = value === ${JSON.stringify(orderNumber)} ? 'Order ' + value + ' will be delivered on ${delivery}.' : 'No order found for "' + value + '".'
}`,
)

export const supportIframe: LocalTask = {
  id: 'support-iframe',
  set: 'browser',
  place: 'local',
  kind: 'embedded',
  prompt: site =>
    `Open the help centre at ${site}/support-iframe/. Use the Order lookup in its support widget to find the delivery date of order ${orderNumber}, and reply with the date exactly as shown.`,
  check: seen => answered(seen, delivery, `${month} ${day} 2026`, `${day} ${month}`, `${month} ${day}`),
  page(path) {
    if (path === '/') return help
    if (path === '/widget') return widget
    return path === '/lookup' ? lookup : undefined
  },
}
