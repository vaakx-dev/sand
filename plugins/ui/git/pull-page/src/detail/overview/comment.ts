import { ago } from '@sand/util'
import { type Child, div, dynamicChild, span } from '@vaakx-dev/vrui'
import { metaRow } from '../../pull/meta'
import type { Shown } from '../shown'
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

export const commentView = (shown: Shown, item: () => CommentLike) =>
  div(
    { class: 'flex min-w-0 flex-col gap-1' },
    authorLine(item),
    dynamicChild(
      () => item().body.trim(),
      body => (body ? richText(shown, body) : null),
    ),
  )
