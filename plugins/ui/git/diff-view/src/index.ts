import { markdown, type Markdown } from '@sand/markdown/contract'
import { kit } from '@sand/ui-kit/contract'
import { sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { diffView } from './contract'
import { diffFiles } from './service'

export default definePlugin({
  name: 'git-diff-view',
  description: 'Draws file diffs the same way everywhere: unified or split rows with line numbers, changed words, syntax colors, line picking and notes under lines',
  inject: { kit },
  apply(ctx) {
    const highlighter = sig<Markdown | undefined>(undefined)
    ctx.watch(markdown, found => highlighter.set(found))
    ctx.provide(diffView, diffFiles(ctx.kit, highlighter))
  },
})
