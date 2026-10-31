import { ago } from '@sand/util'
import { type Child, div, dynamicChild, span } from '@vaakx-dev/vrui'
import type { PageParts } from '../../parts'
import { metaRow } from '../../pull/meta'
import { richText } from './text'

export interface CommentLike {
  author: string
  body: string
  at: number
}

export const authorLine = (item: () => CommentLike, ...extra: Child[]) =>
  metaRow(
    span({ class: 'min-w-0 truncate font-medium text-neutral-100' }, () => item().author),
    ...extra,
    span({ class: 'shrink-0', title: () => new Date(item().at).toLocaleString() }, () => ago(item().at)),
  )

export const commentView = (parts: PageParts, item: () => CommentLike) =>
  div(
    { class: 'flex min-w-0 flex-col gap-1' },
    authorLine(item),
    dynamicChild(
      () => item().body.trim(),
      body => (body ? richText(parts, body) : null),
    ),
  )
