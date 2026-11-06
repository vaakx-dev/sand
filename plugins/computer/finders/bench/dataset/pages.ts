import { icons, svg } from './icons'
import type { Random } from './random'

export type Theme = 'light' | 'dark'

export type Kind = 'icon' | 'look-alike' | 'context' | 'text' | 'field' | 'switch' | 'calendar' | 'tiny' | 'large'

const escape = (text: string) => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')

const target = (kind: Kind, description: string) => `data-kind="${kind}" data-target="${escape(description)}"`

const label = (name: string) => name[0]!.toUpperCase() + name.slice(1)

const iconButton = (name: string, size: number, description: string, kind: Kind) =>
  `<button class="icon" style="padding:${Math.max(2, Math.round(size / 5))}px" aria-label="${label(name)}" ${target(kind, description)}>${svg(name, size)}</button>`

const people = ['Dana Ortiz', 'Ravi Menon', 'Lena Fischer', 'Tomás Rey', 'Aiko Mori', 'Sam Okafor', 'Nora Lind', 'Iván Petrov', 'Mia Chen', 'Owen Hart', 'Zara Ali', 'Ben Cole']

const companies = ['Maple & Co', 'Brightline Ltd', 'Northwind', 'Quarry Labs', 'Tidewater', 'Lumen Studio', 'Copperleaf', 'Harbor Health', 'Kestrel AI', 'Juniper Foods', 'Orbit Freight', 'Pinecrest', 'Silverline', 'Vantage Bank', 'Willow Hotels', 'Atlas Mining']

const topbar = (r: Random) => {
  const links = r.some(['Dashboard', 'Projects', 'Reports', 'Team', 'Billing', 'Roadmap', 'Docs', 'Insights'], 6)
  const size = r.pick([14, 16, 18])
  return `<header class="top"><span class="logo">${r.pick(['Northwind', 'Lumen', 'Quarry', 'Tidewater'])}</span>
<nav>${links.map(link => `<a href="#" ${target('text', `the '${link}' link in the top navigation`)}>${link}</a>`).join('')}</nav>
<input class="search" placeholder="Search…" aria-label="Search" ${target('field', 'the search field in the top bar')}>
<div class="row">${r
    .some(['notifications', 'mail', 'calendar', 'help', 'settings', 'account'], 5)
    .map(name => iconButton(name, size, `the ${name} button (${icons[name]!.shape} icon) in the top bar`, 'icon'))
    .join('')}</div></header>`
}

const formatting = (r: Random) => {
  const groups = [['undo', 'redo'], ['align left', 'align center', 'align right', 'justify'], ['bulleted list', 'numbered list', 'indent', 'outdent'], ['zoom in', 'zoom out'], ['lock', 'unlock'], ['show', 'hide'], ['import', 'export', 'download', 'upload']]
  const size = r.pick([11, 12, 14])
  const buttons = r.some(groups, r.int(5, 7)).flatMap(group =>
    group.map(name => iconButton(name, size, `the ${name} button (${icons[name]!.shape}) in the formatting toolbar`, 'look-alike')),
  )
  return `<section class="panel wide"><div class="toolbar">${buttons.join('')}</div>
<textarea rows="5" aria-label="Document" ${target('large', 'the document text area under the formatting toolbar')}>Quarterly review draft…</textarea></section>`
}

const table = (r: Random) => {
  const customers = r.some(companies, r.int(10, 16))
  const size = r.pick([11, 12, 13])
  const rows = customers.map(customer => {
    const invoice = `INV-${r.int(1000, 9999)}`
    const statuses = ['Paid', 'Overdue', 'Draft', 'Sent']
    const actions = ['edit', 'copy', 'delete', 'more'].map(name => iconButton(name, size, `the ${name} button (${icons[name]!.shape}) in the row for ${customer}`, 'look-alike'))
    return `<tr><td><input type="checkbox" aria-label="Select ${customer}" ${target('look-alike', `the selection checkbox in the row for ${customer}`)}></td>
<td><a href="#" ${target('text', `the '${invoice}' invoice link`)}>${invoice}</a></td><td>${customer}</td><td><span class="pill">${r.pick(statuses)}</span></td><td>$${r.int(100, 99000).toLocaleString('en')}</td><td class="actions">${actions.join('')}</td></tr>`
  })
  const pages = Array.from({ length: 9 }, (_, index) => `<a href="#" ${target('tiny', `page ${index + 1} in the invoice table pagination`)}>${index + 1}</a>`)
  return `<section class="panel wide"><h3>Invoices</h3><table><tr><th></th><th>Invoice</th><th>Customer</th><th>Status</th><th>Amount</th><th></th></tr>${rows.join('')}</table>
<div class="pages">${iconButton('previous', 10, 'the previous-page arrow in the invoice table pagination', 'tiny')}${pages.join('')}${iconButton('next', 10, 'the next-page arrow in the invoice table pagination', 'tiny')}</div></section>`
}

const panels = (r: Random) =>
  r
    .some(['Active projects', 'Archived projects', 'Shared with me', 'Drafts', 'Templates'], 3)
    .map(
      title => `<section class="panel"><div class="head"><h3>${title}</h3>${['New', 'Filter', 'Delete']
        .map(action => `<button class="small" ${target('context', `the ${action} button in the '${title}' panel`)}>${action}</button>`)
        .join('')}</div>${r
        .some(['Q3 roadmap', 'Hiring plan', 'Launch notes', 'Budget 2027', 'Vendor review', 'Brand refresh'], 3)
        .map(item => `<div class="item">${item}<a href="#" ${target('context', `the Open link for '${item}' in the '${title}' panel`)}>Open</a></div>`)
        .join('')}</section>`,
    )
    .join('')

const switches = (r: Random) => {
  const size = r.pick([[22, 12], [28, 16], [34, 18]] as const)
  return `<section class="panel"><h3>Notifications</h3>${r
    .some(['Email notifications', 'Push notifications', 'SMS notifications', 'Weekly digest', 'Product updates', 'Security alerts', 'Mentions only'], 6)
    .map(
      name =>
        `<div class="item">${name}<button role="switch" aria-checked="${r.next() < 0.5}" aria-label="${name}" class="switch" style="width:${size[0]}px;height:${size[1]}px" ${target('switch', `the switch for ${name}`)}></button></div>`,
    )
    .join('')}</section>`
}

const calendar = (r: Random) => {
  const cell = r.pick([18, 22, 26])
  const month = r.pick(['March', 'July', 'November'])
  const days = Array.from({ length: 30 }, (_, index) => `<button class="day" style="width:${cell}px;height:${cell}px" ${target('calendar', `day ${index + 1} in the ${month} calendar`)}>${index + 1}</button>`)
  return `<section class="panel"><div class="head">${iconButton('previous', 10, `the previous-month arrow in the ${month} calendar`, 'tiny')}<h3>${month}</h3>${iconButton('next', 10, `the next-month arrow in the ${month} calendar`, 'tiny')}</div>
<div class="days" style="grid-template-columns:repeat(7, ${cell}px)">${days.join('')}</div></section>`
}

const inbox = (r: Random) => {
  const height = r.pick([110, 140, 170])
  return `<section class="panel"><h3>Inbox</h3><div class="scroll" style="height:${height}px" data-scroll="${r.int(1, 4)}">${r
    .some(people, 12)
    .map(person => `<div class="item">Message from ${person}<button class="small" ${target('context', `the Reply button for the message from ${person} in the inbox`)}>Reply</button></div>`)
    .join('')}</div></section>`
}

const tags = (r: Random) => {
  const size = r.pick([6, 7, 8])
  return `<section class="panel"><h3>Labels</h3><div class="tags">${r
    .some(['urgent', 'design', 'backend', 'billing', 'mobile', 'bug', 'q3', 'legal', 'infra'], 7)
    .map(
      name =>
        `<span class="tag">${name}<button class="x" style="width:${size}px;height:${size}px;font-size:${size + 2}px" aria-label="Remove ${name}" ${target('tiny', `the remove button (×) on the '${name}' label`)}>×</button></span>`,
    )
    .join('')}</div></section>`
}

const actions = (r: Random) => {
  const padding = r.pick(['5px 10px', '8px 14px', '10px 18px'])
  return `<section class="panel"><h3>Reports</h3><div class="tags">${r
    .some(['Export CSV', 'Export PDF', 'Import CSV', 'Share report', 'Schedule report', 'Duplicate report', 'Archive report'], 6)
    .map(name => `<button style="padding:${padding}" ${target('look-alike', `the '${name}' button in the Reports panel`)}>${name}</button>`)
    .join('')}</div></section>`
}

const charts = (r: Random) =>
  `<section class="charts">${r
    .some(['Revenue (EU)', 'Revenue (US)', 'Signups (EU)', 'Signups (US)', 'Churn (EU)', 'Churn (US)'], 4)
    .map(name => {
      const bars = Array.from({ length: 8 }, () => `<i style="height:${r.int(10, 90)}%"></i>`).join('')
      return `<div role="button" tabindex="0" aria-label="${name}" class="chart" style="width:${r.int(160, 260)}px" ${target('large', `the '${name}' chart card`)}><b>${name}</b><div class="bars">${bars}</div></div>`
    })
    .join('')}</section>`

const styles = (theme: Theme, font: number) => {
  const colors =
    theme === 'light'
      ? { bg: '#f6f7f9', panel: '#ffffff', text: '#1d2330', muted: '#6b7280', line: '#e3e6eb', accent: '#2563eb' }
      : { bg: '#101318', panel: '#1a1f27', text: '#e6e9ef', muted: '#9aa3b2', line: '#2b313b', accent: '#60a5fa' }
  return `* { box-sizing: border-box; } body { margin: 0; font: ${font}px system-ui, sans-serif; background: ${colors.bg}; color: ${colors.text}; }
a { color: ${colors.accent}; } h3 { margin: 0 0 6px; font-size: 1.05em; } button, input, select, textarea { font: inherit; color: inherit; background: ${colors.panel}; border: 1px solid ${colors.line}; border-radius: 4px; }
.top { display: flex; align-items: center; gap: 20px; padding: 8px 16px; background: ${colors.panel}; border-bottom: 1px solid ${colors.line}; }
.top nav { display: flex; gap: 14px; } .logo { font-weight: 700; } .search { flex: 0 1 260px; padding: 4px 8px; } .row { display: flex; gap: 4px; margin-left: auto; }
.icon { display: inline-flex; border: none; background: transparent; color: ${colors.text}; }
main { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 12px; padding: 12px; align-items: start; }
.panel { background: ${colors.panel}; border: 1px solid ${colors.line}; border-radius: 8px; padding: 10px; } .wide { grid-column: span 2; }
.toolbar { display: flex; flex-wrap: wrap; gap: 0; border-bottom: 1px solid ${colors.line}; margin-bottom: 6px; } textarea { width: 100%; }
table { border-collapse: collapse; width: 100%; } td, th { padding: 2px 6px; border-bottom: 1px solid ${colors.line}; text-align: left; white-space: nowrap; } .actions { display: flex; }
.pill { padding: 0 6px; border-radius: 8px; background: ${colors.line}; font-size: 0.85em; } .pages { display: flex; gap: 6px; align-items: center; margin-top: 6px; font-size: 0.85em; }
.head { display: flex; align-items: center; gap: 6px; } .head h3 { margin: 0 auto 0 0; } .small { padding: 1px 6px; font-size: 0.85em; }
.item { display: flex; justify-content: space-between; align-items: center; padding: 3px 0; border-bottom: 1px solid ${colors.line}; }
.switch { border-radius: 99px; background: ${colors.line}; padding: 0; } .switch[aria-checked="true"] { background: ${colors.accent}; }
.days { display: grid; gap: 2px; margin-top: 6px; } .day { padding: 0; font-size: 0.8em; }
.scroll { position: relative; overflow: auto; border: 1px solid ${colors.line}; padding: 0 6px; } .tags { display: flex; flex-wrap: wrap; gap: 6px; }
.tag { display: inline-flex; align-items: center; gap: 3px; padding: 1px 6px; border-radius: 10px; background: ${colors.line}; font-size: 0.85em; }
.x { display: inline-flex; align-items: center; justify-content: center; padding: 0; border: none; background: transparent; line-height: 1; }
.charts { display: flex; flex-wrap: wrap; gap: 10px; grid-column: 1 / -1; } .chart { display: flex; flex-direction: column; gap: 6px; height: 150px; padding: 10px; background: ${colors.panel}; border: 1px solid ${colors.line}; border-radius: 8px; }
.bars { flex: 1; display: flex; align-items: flex-end; gap: 4px; } .bars i { flex: 1; background: ${colors.accent}; opacity: 0.7; }`
}

export const page = (r: Random, theme: Theme) => {
  const sections = r.shuffle([formatting, table, panels, switches, calendar, inbox, tags, actions, charts]).map(section => section(r))
  const scroll = r.next() < 0.4 ? r.int(20, 60) : 0
  return `<!doctype html><html><head><meta charset="utf-8"><style>${styles(theme, r.pick([11, 12, 13]))}</style></head>
<body data-scroll-page="${scroll}">${topbar(r)}<main>${sections.join('\n')}</main></body></html>`
}
