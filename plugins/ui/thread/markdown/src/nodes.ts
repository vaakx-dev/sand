import { a, div, el, em, li, ol, p, span, strong, table, tbody, td, th, thead, tr, ul } from '@sand/dom'

export type Align = 'left' | 'center' | 'right'

const block = 'mb-3 last:mb-0'
const headingTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const
const headingSizes = ['text-xl', 'text-lg', 'text-base']
const alignments: Record<Align, string> = { left: 'text-left', center: 'text-center', right: 'text-right' }

export const text = (value: string) => document.createTextNode(value)

export const paragraph = (children: Node[]) => p({ class: block }, children)

export const heading = (level: number, children: Node[]) =>
  el(headingTags[level - 1] ?? 'h6', { class: ['mt-5 mb-2 first:mt-0 last:mb-0 font-semibold text-neutral-100', headingSizes[level - 1]] }, children)

export const thematicBreak = () => el('hr', { class: 'my-5 border-t border-neutral-700 first:mt-0 last:mb-0' })

export const blockquote = (children: Node[]) => el('blockquote', { class: [block, 'border-l border-neutral-600 pl-3 text-neutral-400'] }, children)

export const listBlock = (ordered: boolean, start: number, tasks: boolean, items: HTMLElement[]) => {
  const indent = [block, tasks ? 'list-none pl-1' : 'pl-6']
  return ordered ? ol({ class: indent, ...(start !== 1 && { start }) }, items) : ul({ class: indent }, items)
}

export const listItem = (children: Node[]) => li({ class: 'my-1' }, children)

export const taskItem = (done: boolean, children: Node[]) =>
  li({ class: 'my-1 list-none' }, span({ class: 'mr-2 text-accent-400' }, done ? '☑' : '☐'), children)

export const tableCell = (head: boolean, align: Align | undefined, children: Node[]) =>
  (head ? th : td)({ class: ['border-b border-neutral-800 px-3 py-2', alignments[align ?? 'left'], head && 'font-semibold text-neutral-100'] }, children)

export const tableBlock = (head: HTMLElement, rows: HTMLElement[]) =>
  div({ class: [block, 'overflow-auto'] }, table({ class: 'text-xs' }, thead(head), tbody(rows)))

export const tableRow = (cells: HTMLElement[]) => tr(cells)

export const inlineCode = (value: string) => el('code', { class: 'rounded-md bg-neutral-700 px-1 py-px font-mono text-xs text-neutral-100' }, value)

export const lineBreak = () => el('br')

export type Emphasis = 'em' | 'strong' | 'del'

export const emphasis = (kind: Emphasis, children: Node[]) => {
  if (kind === 'strong') return strong({ class: 'font-semibold text-neutral-100' }, children)
  if (kind === 'del') return el('del', { class: 'text-neutral-500' }, children)
  return em(children)
}

export const anchor = (href: string, title: string | undefined, children: Node[]) =>
  a({ class: 'text-accent-400 no-underline hover:underline', href, target: '_blank', rel: 'noopener noreferrer', referrerPolicy: 'no-referrer', ...(title && { title }) }, children)

export const blockedLink = (href: string, children: Node[]) => el('s', { class: 'text-neutral-500', title: `Blocked link: ${href}` }, children)
