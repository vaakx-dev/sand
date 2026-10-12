import { a, div, el, em, h1, h2, h3, h4, h5, h6, li, ol, p, span, strong, table, tbody, td, th, thead, tr, ul } from '@vaakx-dev/vrui'

export type Inline = Node | string

export type Align = 'left' | 'center' | 'right'

export type Emphasis = 'em' | 'strong' | 'del'

const block = 'mb-3 last:mb-0'

const headings = [
  { tag: h1, size: 'text-xl' },
  { tag: h2, size: 'text-lg' },
  { tag: h3, size: 'text-base' },
  { tag: h4 },
  { tag: h5 },
  { tag: h6 },
]

const alignments: Record<Align, string> = { left: 'text-left', center: 'text-center', right: 'text-right' }

export const paragraph = (children: Inline[]) => p({ class: block }, children)

export const heading = (level: number, children: Inline[]) => {
  const { tag, size } = headings[level - 1] ?? { tag: h6 }
  return tag({ class: ['mt-5 mb-2 first:mt-0 last:mb-0 font-semibold text-neutral-100', size] }, children)
}

export const thematicBreak = () => el('hr', { class: 'my-5 border-t border-neutral-700 first:mt-0 last:mb-0' })

export const blockquote = (children: Node[]) => el('blockquote', { class: [block, 'border-l border-neutral-600 pl-3 text-neutral-400'] }, children)

export const listBlock = (ordered: boolean, start: number, tasks: boolean, items: HTMLElement[]) => {
  const indent = [block, tasks ? 'list-none pl-1' : 'pl-6']
  return ordered ? ol({ class: indent, ...(start !== 1 && { start }) }, items) : ul({ class: indent }, items)
}

export const listItem = (children: Node[]) => li({ class: 'my-1 marker:text-neutral-500' }, children)

export const taskItem = (done: boolean, children: Node[]) =>
  li({ class: 'my-1 list-none' }, span({ class: 'mr-2 text-accent-400' }, done ? '☑' : '☐'), children)

export const tableCell = (head: boolean, align: Align | undefined, children: Inline[]) =>
  (head ? th : td)({ class: ['border-b border-neutral-800 px-3 py-2 align-top', alignments[align ?? 'left'], head && 'font-semibold text-neutral-100'] }, children)

export const tableBlock = (head: HTMLElement[], rows: HTMLElement[][]) =>
  div({ class: [block, 'overflow-auto'] }, table({ class: 'border-collapse text-xs' }, thead(tr(head)), tbody(rows.map(cells => tr(cells)))))

export const inlineCode = (value: string) => el('code', { class: 'rounded-md bg-neutral-700 px-1 py-px font-mono text-xs text-neutral-100' }, value)

export const lineBreak = () => el('br')

export const emphasis = (kind: Emphasis, children: Inline[]) => {
  if (kind === 'strong') return strong({ class: 'font-semibold text-neutral-100' }, children)
  if (kind === 'del') return el('del', { class: 'text-neutral-500' }, children)
  return em(children)
}

export const anchor = (href: string, title: string | undefined, children: Inline[]) =>
  a({ class: 'text-accent-400 no-underline hover:underline', href, target: '_blank', rel: 'noopener noreferrer', referrerPolicy: 'no-referrer', ...(title && { title }) }, children)

export const blockedLink = (href: string, children: Inline[]) => el('s', { class: 'text-neutral-500', title: `Blocked link: ${href}` }, children)
