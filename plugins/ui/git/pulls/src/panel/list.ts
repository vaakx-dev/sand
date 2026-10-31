import { pullKey } from '@sand/github/contract'
import { pullName } from '@sand/github/look'
import type { PullLine, PullLink } from '@sand/pull-links/contract'
import { type Derive, div, dynamicChild, type Sig, span } from '@vaakx-dev/vrui'
import type { PullParts } from '../parts'
import { attentionLook } from '../pull/look'

const indents = ['', 'pl-4', 'pl-8', 'pl-12']

const indentOf = (depth: number) => indents[Math.min(depth, indents.length - 1)] ?? ''

const metaOf = (link: PullLink) => {
  const look = attentionLook(link.summary)
  return `${pullName(link)} · ${look.short ?? look.label}`
}

const pullRow = (parts: PullParts, line: Sig<PullLine>, selected: Derive<string | undefined>) => {
  const { kit } = parts
  const link = line.map(found => found.link)
  const look = link.map(found => attentionLook(found.summary))
  return div(
    { class: () => indentOf(line.get().depth) },
    kit.listRow({
      lead: dynamicChild(look, found => span({ class: ['inline-flex', kit.toneText[found.tone]] }, kit.icon(found.icon, 16))),
      title: () => link.get().summary?.title ?? pullName(link.get()),
      meta: () => metaOf(link.get()),
      current: () => selected.get() === pullKey(link.get()),
      onClick: () => parts.focus.set(pullKey(link.get())),
    }),
  )
}

export const pullList = (parts: PullParts, selected: Derive<string | undefined>) =>
  div(
    { class: 'flex flex-col' },
    parts.kit.rowList(
      parts.arrangement.map(found => found.lines),
      line => pullKey(line.link),
      line => pullRow(parts, line, selected),
    ),
  )
