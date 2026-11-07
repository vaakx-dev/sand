import type { LocalTask, Seen, Verdict } from '../task'
import { digits, layout } from './layout'

const link = `https://wiki.example.com/cutover/${digits(4)}`
const bold = 'release manager signs off'
const linked = 'legacy billing database'
const heading = 'Risks and open questions'

const paragraphs = [
  `This review covers every service that still reads from the ${linked}. Most teams finished early, but a few dependencies turned up late in the process.`,
  `Before the cutover we need a tested rollback plan for each service, and the ${bold} only after it has been rehearsed against a copy of production data.`,
  heading,
  `The biggest risk is the nightly export job: if it runs during the cutover window, invoices can be duplicated, so the schedule must be paused before anything touches the ${linked}.`,
  `Questions go to the platform channel. Once the ${bold}, the final window is confirmed by email.`,
]

const wanted = paragraphs
  .map((text, index) => {
    if (index === 2) return `<h>${text}</h>`
    if (index === 0) return `<p>${text.replace(linked, `<a href="${link}">${linked}</a>`)}</p>`
    return `<p>${index === 1 ? text.replace(bold, `<b>${bold}</b>`) : text}</p>`
  })
  .join('')

const icon = (name: string, shape: string) => `<button type="button" data-tool="${name}"><svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${shape}</svg></button>`

const tools = [
  icon('bold', '<path d="M6 4h5a3 3 0 0 1 0 6H6zM6 10h6a3 3 0 0 1 0 6H6z"/>'),
  icon('italic', '<path d="M8 4h7M5 16h7M11 4l-2 12"/>'),
  icon('underline', '<path d="M6 3v7a4 4 0 0 0 8 0V3M4 17h12"/>'),
  icon('link', '<path d="M8.5 11.5a3 3 0 0 0 4.2 0l3-3a3 3 0 0 0-4.2-4.2l-1 1M11.5 8.5a3 3 0 0 0-4.2 0l-3 3a3 3 0 0 0 4.2 4.2l1-1"/>'),
  icon('heading', '<path d="M5 4v12M15 4v12M5 10h10"/>'),
  icon('list', '<path d="M8 5h9M8 10h9M8 15h9M3.5 5h.01M3.5 10h.01M3.5 15h.01"/>'),
]

const page = layout(
  'Cutover review',
  `<style>
body { overflow: hidden; } main { max-width: 760px; padding-top: 16px; } h1 { margin: 0 0 12px; font-size: 22px; }
.bar { display: flex; gap: 4px; padding: 6px; background: #fff; border: 1px solid #d5d9e0; border-radius: 8px 8px 0 0; border-bottom: 0; position: relative; }
.bar button { width: 32px; height: 32px; border: 0; border-radius: 6px; background: transparent; color: #3a4256; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0; }
.bar button:hover { background: #e8ebf0; } .bar .sep { width: 1px; background: #d5d9e0; margin: 4px 6px; }
#doc { min-height: 420px; padding: 8px 28px; background: #fff; border: 1px solid #d5d9e0; border-radius: 0 0 8px 8px; outline: none; font-size: 16px; line-height: 1.6; }
#doc h2 { font-size: 22px; margin: 18px 0 6px; } #doc a { color: #2155c4; } #doc ul { margin: 8px 0; }
#tip { position: fixed; z-index: 5; background: #1d2330; color: #fff; font-size: 12px; padding: 4px 8px; border-radius: 4px; pointer-events: none; display: none; }
#pop { position: absolute; z-index: 4; top: 46px; left: 100px; width: 280px; background: #fff; border: 1px solid #c4cad6; border-radius: 8px; box-shadow: 0 6px 20px rgba(0,0,0,.18); padding: 10px; display: none; }
#pop input { width: 100%; box-sizing: border-box; padding: 6px 8px; border: 1px solid #c4cad6; border-radius: 4px; } #pop div { margin-top: 8px; display: flex; gap: 8px; justify-content: flex-end; }
#pop button { width: auto; height: auto; padding: 4px 12px; border: 1px solid #c4cad6; background: #f6f7f9; border-radius: 4px; cursor: pointer; font-size: 13px; color: #1d2330; }
</style>
<header><b>Notebook</b><span>Documents</span><span>Shared with me</span></header>
<main><h1>Cutover review</h1>
<div class="bar">${tools.slice(0, 3).join('')}<span class="sep"></span>${tools.slice(3).join('')}
<div id="pop"><input type="text" id="url" placeholder="Paste or type a link"><div><button type="button" id="cancel">Cancel</button><button type="button" id="apply">Apply</button></div></div></div>
<div id="doc" contenteditable="true">${paragraphs.map(text => `<p>${text}</p>`).join('')}</div>
<input type="hidden" name="html" value=""></main><div id="tip" aria-hidden="true"></div>`,
  `const doc = document.getElementById('doc')
const bar = document.querySelector('.bar')
const pop = document.getElementById('pop')
const url = document.getElementById('url')
const tip = document.getElementById('tip')
const names = { bold: 'Bold', italic: 'Italic', underline: 'Underline', link: 'Link', heading: 'Heading', list: 'Bulleted list' }
let saved
let timer
const sync = () => { document.querySelector('input[name=html]').value = doc.innerHTML }
const closePop = () => { pop.style.display = 'none'; url.value = '' }
const run = {
  bold: () => document.execCommand('bold'),
  italic: () => document.execCommand('italic'),
  underline: () => document.execCommand('underline'),
  heading: () => document.execCommand('formatBlock', false, document.queryCommandValue('formatBlock') === 'h2' ? 'p' : 'h2'),
  list: () => document.execCommand('insertUnorderedList'),
  link: () => {
    const selection = getSelection()
    saved = selection.rangeCount ? selection.getRangeAt(0).cloneRange() : undefined
    pop.style.display = 'block'
    url.focus()
  },
}
bar.addEventListener('mousedown', event => {
  if (!event.target.closest('#pop')) event.preventDefault()
})
bar.addEventListener('click', event => {
  const button = event.target.closest('[data-tool]')
  if (!button) return
  closePop()
  run[button.dataset.tool]()
  sync()
})
bar.addEventListener('mouseover', event => {
  const button = event.target.closest('[data-tool]')
  clearTimeout(timer)
  tip.style.display = 'none'
  if (!button) return
  timer = setTimeout(() => {
    const box = button.getBoundingClientRect()
    tip.textContent = names[button.dataset.tool]
    tip.style.display = 'block'
    tip.style.left = box.left + 'px'
    tip.style.top = box.bottom + 6 + 'px'
  }, 350)
})
bar.addEventListener('mouseleave', () => { clearTimeout(timer); tip.style.display = 'none' })
const apply = () => {
  if (saved && url.value) {
    doc.focus()
    const selection = getSelection()
    selection.removeAllRanges()
    selection.addRange(saved)
    document.execCommand('createLink', false, url.value)
  }
  closePop()
  sync()
}
document.getElementById('apply').addEventListener('click', apply)
document.getElementById('cancel').addEventListener('click', closePop)
url.addEventListener('keydown', event => {
  if (event.key === 'Enter') { event.preventDefault(); apply() }
  if (event.key === 'Escape') closePop()
})
doc.addEventListener('input', sync)
sync()`,
)

const clean = (html: string) =>
  html
    .replace(/&nbsp;|\u00a0/g, ' ')
    .replace(/<br\s*\/?>/g, '')
    .replace(/<a\s[^>]*?href="([^"]*)"[^>]*>/g, '<a href="$1">')
    .replace(/<(\/?)strong\b[^>]*>/g, '<$1b>')
    .replace(/<(\/?)h[1-6]\b[^>]*>/g, '<$1h>')
    .replace(/<(\/?)(p|b|i|u|span|div)\b[^>]*>/g, '<$1$2>')
    .replace(/<\/b><b>/g, '')
    .replace(/\s+/g, ' ')
    .replace(/> </g, '><')
    .trim()

const edited = ({ tabs }: Seen): Verdict => {
  const tab = tabs.find(tab => /\/rich-text\/$/.test(tab.url))
  if (!tab) return { pass: false, why: 'the editor is not open' }
  const html = clean(String(tab.fields.html ?? ''))
  return html === wanted ? { pass: true, why: 'document formatted as asked' } : { pass: false, why: `document is ${html}` }
}

export const richText: LocalTask = {
  id: 'rich-text',
  set: 'browser',
  place: 'local',
  kind: 'tiny',
  prompt: site =>
    `Open the document editor at ${site}/rich-text/. Edit the document: in the second paragraph make exactly the words "${bold}" bold; in the first paragraph turn exactly the words "${linked}" into a link to ${link} (use the link button in the toolbar and its popover); and make the third paragraph ("${heading}") a heading. The same words also appear in other paragraphs: leave those, and everything else in the document, unchanged.`,
  check: edited,
  page: path => (path === '/' ? page : undefined),
}
