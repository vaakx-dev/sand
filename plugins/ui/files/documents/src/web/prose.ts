import { a, type Child, div, el, img, span, table as htmlTable } from '@vaakx-dev/vrui'

const LOOKS = {
  p: 'mb-3',
  h1: 'mt-5 mb-3 text-xl font-semibold first:mt-0',
  h2: 'mt-5 mb-2 text-lg font-semibold first:mt-0',
  h3: 'mt-4 mb-2 text-base font-semibold first:mt-0',
  h4: 'mt-3 mb-2 font-semibold',
  h5: 'mt-3 mb-1 font-semibold',
  h6: 'mt-3 mb-1 font-medium',
  ul: 'mb-3 pl-6',
  ol: 'mb-3 pl-6',
  li: 'mb-1',
  dl: 'mb-3',
  dt: 'font-semibold',
  dd: 'mb-2 pl-4',
  blockquote: 'mb-3 border-l border-neutral-700 pl-3 text-neutral-400',
  pre: 'mb-3 overflow-x-auto rounded-md bg-neutral-900 p-3 font-mono text-xs whitespace-pre',
  code: 'font-mono text-xs',
  figure: 'mb-3',
  figcaption: 'text-xs text-neutral-500',
  caption: 'mb-1 text-xs text-neutral-500',
  thead: '',
  tbody: '',
  tr: '',
  th: 'border border-neutral-800 px-2 py-1 text-left align-top font-semibold',
  td: 'border border-neutral-800 px-2 py-1 text-left align-top',
  hr: 'my-4 border-t border-neutral-800',
  br: '',
  strong: '',
  b: '',
  em: '',
  i: '',
  u: '',
  s: '',
  sub: '',
  sup: '',
  small: 'text-xs',
  div: '',
  span: '',
}

type Tag = keyof typeof LOOKS

const MAX_SPAN = 1_000

const isTag = (name: string): name is Tag => Object.hasOwn(LOOKS, name)

const spanOf = (value: string | null) => {
  const count = Number(value)
  return Number.isInteger(count) && count > 1 ? Math.min(count, MAX_SPAN) : undefined
}

const element = (tag: Tag, children: Child[]) => el(tag, { class: LOOKS[tag] }, ...children)

const cell = (tag: 'td' | 'th', spans: { columns: string | null; rows: string | null }, children: Child[]) =>
  el(tag, { class: LOOKS[tag], colSpan: spanOf(spans.columns) ?? 1, rowSpan: spanOf(spans.rows) ?? 1 }, ...children)

const table = (children: Child[]) => div({ class: 'mb-3 max-w-full overflow-x-auto' }, htmlTable({ class: 'border-collapse text-xs' }, ...children))

const picture = (src: string, alt: string) => img({ src, alt, class: 'inline-block max-w-full rounded-md' })

const unshownPicture = (note: string) => span({ class: 'text-xs text-neutral-500' }, `[${note}]`)

const webLink = (href: string, children: Child[]) =>
  /^(https?:|mailto:)/i.test(href) ? a({ href, target: '_blank', rel: 'noopener noreferrer', class: 'text-accent-400 underline' }, ...children) : span(...children)

const spaces = (text: string) => span({ class: 'whitespace-pre' }, text)


export { cell, element, isTag, picture, spaces, table, unshownPicture, webLink }
