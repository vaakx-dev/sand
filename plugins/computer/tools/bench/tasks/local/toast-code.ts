import type { LocalTask } from '../task'
import { layout } from './layout'

const script = `let current
const toasts = document.getElementById('toasts')
const message = document.getElementById('message')
const code = document.getElementById('code')
const verified = document.getElementById('verified')
document.getElementById('send').onclick = () => {
  const sent = String(Math.floor(100000 + Math.random() * 900000))
  current = { sent, at: Date.now() }
  const toast = document.createElement('div')
  toast.className = 'toast'
  toast.textContent = 'Northgate: your verification code is ' + sent + '. It expires in 1 minute.'
  toasts.replaceChildren(toast)
  setTimeout(() => toast.remove(), 4000)
  message.textContent = 'We sent a code to your phone.'
  message.className = ''
  code.value = ''
}
document.getElementById('form').onsubmit = event => {
  event.preventDefault()
  const entered = code.value.replace(/\\s/g, '')
  message.className = 'bad'
  if (!current || entered !== current.sent) message.textContent = 'That code is not valid. Check it and try again.'
  else if (Date.now() - current.at > 60000) message.textContent = 'That code has expired. Send a new one.'
  else {
    verified.value = 'yes'
    document.getElementById('card').innerHTML = '<h1>You are signed in</h1><p>Your sign-in was verified. Welcome back, Jordan.</p>'
  }
}`

const page = layout(
  'Verify sign-in - Northgate',
  `<style>
body { background: #eef1f6; } .bar { background: #fff; border-bottom: 1px solid #d5d9e0; padding: 14px 28px; font-weight: 700; color: #1d3f77; font-size: 18px; }
#card { max-width: 440px; margin: 56px auto; background: #fff; border: 1px solid #d5d9e0; border-radius: 12px; padding: 28px 32px; box-shadow: 0 4px 18px rgba(20,30,60,.08); } #card h1 { margin: 0 0 8px; font-size: 22px; } #card p { color: #4a5568; margin: 0 0 18px; }
.send { background: #fff; border: 1px solid #2155c4; color: #2155c4; border-radius: 6px; padding: 8px 16px; cursor: pointer; } .verify { background: #2155c4; color: #fff; border: 0; border-radius: 6px; padding: 9px 18px; cursor: pointer; margin-top: 14px; }
#code { letter-spacing: 6px; font-size: 20px; width: 200px; } #message { margin: 14px 0 0; min-height: 24px; color: #4a5568; } #message.bad { color: #b3261e; }
#toasts { position: fixed; top: 18px; right: 18px; width: 300px; } .toast { background: #1d2330; color: #fff; padding: 14px 16px; border-radius: 8px; box-shadow: 0 6px 22px rgba(0,0,0,.35); font-size: 15px; }
</style><div class="bar">Northgate</div>
<div id="card"><h1>Verify it's you</h1><p>To finish signing in as <b>j•••@mail.example</b>, we text a 6-digit code to the phone ending in 42.</p>
<button type="button" class="send" id="send">Send code</button>
<form id="form"><label for="code">Verification code</label><input type="text" id="code" name="code" inputmode="numeric" maxlength="6" autocomplete="off"><br><button class="verify">Verify</button></form>
<p id="message" role="status"></p></div><input type="hidden" name="verified" id="verified" value="no"><div id="toasts"></div>`,
  script,
)

export const toastCode: LocalTask = {
  id: 'toast-code',
  set: 'browser',
  place: 'local',
  kind: 'interrupt',
  prompt: site => `Complete the sign-in verification on the test page at ${site}/toast-code/ so that the sign-in is verified.`,
  check: ({ tabs }) =>
    tabs.some(tab => /\/toast-code\//.test(tab.url) && tab.fields.verified === 'yes')
      ? { pass: true, why: 'sign-in verified' }
      : { pass: false, why: 'sign-in was not verified' },
  page: path => (path === '/' ? page : undefined),
}
