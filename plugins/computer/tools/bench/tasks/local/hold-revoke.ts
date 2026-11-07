import type { LocalTask, Seen, Verdict } from '../task'
import { digits, layout, pick } from './layout'

const services = ['Billing sync', 'CI deploy', 'Analytics export', 'Support inbox', 'Backup job', 'Status page', 'Search indexer', 'Mobile app', 'Partner feed', 'Data warehouse']

const keys = services.map(name => ({ name, id: `key_${digits(6)}`, used: `${1 + Math.floor(Math.random() * 28)} days ago` }))

const wanted = pick(keys)

const rows = keys
  .map(
    key =>
      `<tr><td><b>${key.name}</b><br><code>${key.id}</code></td><td>${key.used}</td><td><button type="button" class="revoke" data-id="${key.id}"><span class="fill"></span><span class="label">Revoke</span></button></td></tr>`,
  )
  .join('')

const page = layout(
  'API keys - Northgate',
  `<style>
.revoke { position: relative; overflow: hidden; border: 1px solid #b3261e; color: #b3261e; background: #fff; border-radius: 6px; padding: 6px 14px; min-width: 150px; cursor: pointer; }
.revoke .fill { position: absolute; inset: 0; width: 0; background: #f6d4d1; } .revoke .label { position: relative; } .revoke.done { border-color: #999; color: #777; cursor: default; }
#hint { min-height: 24px; color: #b3261e; }
</style><header><b>Northgate</b><span>Developer settings</span></header><main><h1>API keys</h1><p>Revoking a key is permanent. To avoid accidents, press and hold <b>Revoke</b> for two seconds.</p><p id="hint" role="status"></p>
<table><tr><th>Key</th><th>Last used</th><th></th></tr>${rows}</table><input type="hidden" name="revoked" id="revoked" value=""></main>`,
  `const holdMs = 2000
const revoked = []
for (const button of document.querySelectorAll('.revoke')) {
  let timer
  const fill = button.querySelector('.fill')
  const release = () => {
    if (button.classList.contains('done')) return
    clearTimeout(timer)
    fill.style.transition = 'none'
    fill.style.width = '0'
  }
  button.addEventListener('pointerdown', () => {
    if (button.classList.contains('done')) return
    fill.style.transition = 'width ' + holdMs + 'ms linear'
    fill.style.width = '100%'
    timer = setTimeout(() => {
      button.classList.add('done')
      button.querySelector('.label').textContent = 'Revoked'
      revoked.push(button.dataset.id)
      document.getElementById('revoked').value = revoked.join('|')
    }, holdMs)
  })
  button.addEventListener('pointerup', release)
  button.addEventListener('pointerleave', release)
  button.addEventListener('click', () => {
    if (!button.classList.contains('done')) document.getElementById('hint').textContent = 'Keep holding Revoke for two seconds to revoke the key.'
  })
}`,
)

const revokedOnly = ({ tabs }: Seen): Verdict => {
  const tab = tabs.find(each => /\/hold-revoke\/$/.test(each.url))
  if (!tab) return { pass: false, why: 'the API keys page is not open' }
  const revoked = String(tab.fields.revoked ?? '')
  return revoked === wanted.id ? { pass: true, why: `revoked only ${wanted.id}` } : { pass: false, why: `revoked "${revoked}", wanted ${wanted.id}` }
}

export const holdRevoke: LocalTask = {
  id: 'hold-revoke',
  set: 'browser',
  place: 'local',
  kind: 'gesture',
  prompt: site => `On the API keys page at ${site}/hold-revoke/, revoke the key for "${wanted.name}" (and no other key).`,
  check: revokedOnly,
  page: path => (path === '/' ? page : undefined),
}
